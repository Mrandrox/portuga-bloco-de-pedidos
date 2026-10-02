package com.blocodenotas.app;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private BluetoothSocket socket;
    private OutputStream output;
    private String selectedAddress = "";
    private String selectedName = "";

    @Override
    public void load() {
        super.load();
        SharedPreferences prefs =
            getContext().getSharedPreferences("portuga_printer", 0);
        selectedAddress = prefs.getString("address", "");
        selectedName = prefs.getString("name", "");
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasBluetoothPermission()) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("bluetooth", call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermission()) {
            call.reject("Permissão de Bluetooth negada.");
            return;
        }
        call.resolve();
    }

    private boolean hasBluetoothPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.BLUETOOTH_CONNECT
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter getAdapter() throws IOException {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            throw new IOException("Este aparelho não possui Bluetooth.");
        }
        if (!adapter.isEnabled()) {
            throw new IOException("Bluetooth está desligado.");
        }
        return adapter;
    }

    @PluginMethod
    public void listPaired(PluginCall call) {
        if (!hasBluetoothPermission()) {
            call.reject("Permissão de Bluetooth necessária.");
            return;
        }

        try {
            BluetoothAdapter adapter = getAdapter();
            JSArray devices = new JSArray();

            for (BluetoothDevice device : adapter.getBondedDevices()) {
                JSObject item = new JSObject();
                item.put("name", safeName(device));
                item.put("address", device.getAddress());
                item.put("type", "classic");
                devices.put(item);
            }

            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (Exception e) {
            call.reject(safeMessage(e), e);
        }
    }

    @PluginMethod
    public void choosePrinter(PluginCall call) {
        if (!hasBluetoothPermission()) {
            call.reject("Permissão de Bluetooth necessária.");
            return;
        }

        try {
            final BluetoothAdapter adapter = getAdapter();
            final List<BluetoothDevice> devices =
                new ArrayList<>(adapter.getBondedDevices());

            if (devices.isEmpty()) {
                call.reject("Nenhuma impressora Bluetooth pareada.");
                return;
            }

            final String[] labels = new String[devices.size()];
            for (int i = 0; i < devices.size(); i++) {
                labels[i] =
                    safeName(devices.get(i)) + "\n" +
                    devices.get(i).getAddress();
            }

            getActivity().runOnUiThread(() ->
                new AlertDialog.Builder(getActivity())
                    .setTitle("Escolha a impressora térmica")
                    .setItems(labels, (dialog, which) -> {
                        BluetoothDevice device = devices.get(which);
                        selectedAddress = device.getAddress();
                        selectedName = safeName(device);
                        saveSelected();

                        JSObject result = new JSObject();
                        result.put("name", selectedName);
                        result.put("address", selectedAddress);
                        result.put("type", "classic");
                        call.resolve(result);
                    })
                    .setNegativeButton(
                        "Cancelar",
                        (dialog, which) -> call.reject("Seleção cancelada.")
                    )
                    .setOnCancelListener(
                        dialog -> call.reject("Seleção cancelada.")
                    )
                    .show()
            );
        } catch (Exception e) {
            call.reject(safeMessage(e), e);
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            getActivity().startActivity(
                new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            );
            call.resolve();
        } catch (Exception e) {
            call.reject(
                "Não foi possível abrir as configurações de Bluetooth.",
                e
            );
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        final String address =
            call.getString("address", selectedAddress);

        if (address == null || address.trim().isEmpty()) {
            call.reject("Nenhuma impressora selecionada.");
            return;
        }

        if (!hasBluetoothPermission()) {
            call.reject("Permissão de Bluetooth necessária.");
            return;
        }

        io.execute(() -> {
            try {
                connectInternal(address);

                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("name", selectedName);
                result.put("address", selectedAddress);
                result.put("type", "classic");
                call.resolve(result);
            } catch (Exception e) {
                closeSocket();
                call.reject(
                    "Não foi possível conectar à impressora: " + safeMessage(e),
                    e
                );
            }
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        final String base64 = call.getString("data", "");

        if (base64 == null || base64.isEmpty()) {
            call.reject("Nenhum dado de impressão recebido.");
            return;
        }

        if (!hasBluetoothPermission()) {
            call.reject("Permissão de Bluetooth necessária.");
            return;
        }

        io.execute(() -> {
            try {
                ensureConnected();

                byte[] data =
                    android.util.Base64.decode(base64, android.util.Base64.DEFAULT);

                for (int offset = 0; offset < data.length; offset += 512) {
                    int length =
                        Math.min(512, data.length - offset);
                    output.write(data, offset, length);
                    output.flush();

                    if (offset + length < data.length) {
                        try {
                            Thread.sleep(15L);
                        } catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                        }
                    }
                }

                JSObject result = new JSObject();
                result.put("sent", data.length);
                call.resolve(result);
            } catch (Exception e) {
                closeSocket();
                call.reject(
                    "Falha ao enviar para a impressora: " + safeMessage(e),
                    e
                );
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        io.execute(() -> {
            closeSocket();
            call.resolve();
        });
    }

    @PluginMethod
    public void getSelected(PluginCall call) {
        JSObject result = new JSObject();
        result.put("name", selectedName);
        result.put("address", selectedAddress);
        result.put(
            "connected",
            socket != null && socket.isConnected() && output != null
        );
        call.resolve(result);
    }

    @PluginMethod
    public void testPrint(PluginCall call) {
        io.execute(() -> {
            try {
                ensureConnected();

                output.write(new byte[]{0x1B, 0x40});
                output.write(new byte[]{0x1B, 0x61, 0x01});
                output.write("PORTUGA - BLOCO DE PEDIDOS\n".getBytes("ISO-8859-1"));
                output.write("Teste de impressora OK\n\n".getBytes("ISO-8859-1"));
                output.write(new byte[]{0x1D, 0x56, 0x41, 0x03});
                output.flush();

                call.resolve();
            } catch (Exception e) {
                closeSocket();
                call.reject(
                    "Teste de impressão falhou: " + safeMessage(e),
                    e
                );
            }
        });
    }

    private void ensureConnected() throws IOException {
        if (socket != null && socket.isConnected() && output != null) {
            return;
        }

        if (selectedAddress == null || selectedAddress.trim().isEmpty()) {
            throw new IOException("Nenhuma impressora selecionada.");
        }

        Exception last = null;

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                connectInternal(selectedAddress);
                return;
            } catch (Exception e) {
                last = e;
                closeSocket();

                try {
                    Thread.sleep(350L);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        throw new IOException(
            last == null ? "Falha de conexão." : safeMessage(last)
        );
    }

    private void connectInternal(String address) throws Exception {
        BluetoothAdapter adapter = getAdapter();

        try {
            adapter.cancelDiscovery();
        } catch (SecurityException ignored) {}

        BluetoothDevice device = adapter.getRemoteDevice(address);

        closeSocket();

        BluetoothSocket newSocket =
            device.createRfcommSocketToServiceRecord(SPP_UUID);

        newSocket.connect();

        socket = newSocket;
        output = newSocket.getOutputStream();
        selectedAddress = address;
        selectedName = safeName(device);
        saveSelected();
    }

    private void saveSelected() {
        getContext()
            .getSharedPreferences("portuga_printer", 0)
            .edit()
            .putString("address", selectedAddress)
            .putString("name", selectedName)
            .apply();
    }

    private String safeName(BluetoothDevice device) {
        try {
            String name = device.getName();
            return name == null || name.trim().isEmpty()
                ? "Impressora Bluetooth"
                : name;
        } catch (SecurityException ignored) {
            return "Impressora Bluetooth";
        }
    }

    private String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null || message.trim().isEmpty()
            ? e.getClass().getSimpleName()
            : message;
    }

    private synchronized void closeSocket() {
        try {
            if (output != null) output.close();
        } catch (Exception ignored) {}

        try {
            if (socket != null) socket.close();
        } catch (Exception ignored) {}

        output = null;
        socket = null;
    }

    @Override
    protected void handleOnDestroy() {
        closeSocket();
        io.shutdownNow();
        super.handleOnDestroy();
    }
}