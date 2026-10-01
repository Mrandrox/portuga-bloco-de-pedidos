package com.blocodenotas.app;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.content.SharedPreferences;
import androidx.core.content.ContextCompat;
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

@CapacitorPlugin(name = "BluetoothPrinter", permissions = {
    @Permission(alias = "bluetooth", strings = {
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_SCAN
    })
})
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private BluetoothSocket socket;
    private OutputStream output;
    private String selectedAddress = "";
    private String selectedName = "";

    @Override public void load() {
        super.load();
        SharedPreferences p = getContext().getSharedPreferences("bloco_printer", 0);
        selectedAddress = p.getString("address", "");
        selectedName = p.getString("name", "");
    }

    @PluginMethod public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasBluetoothPermissions()) {
            call.resolve(); return;
        }
        requestPermissionForAlias("bluetooth", call, "permissionsCallback");
    }

    @PermissionCallback private void permissionsCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            call.reject("Permissão de Bluetooth negada."); return;
        }
        call.resolve();
    }

    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod public void listPaired(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            call.reject("Permissão de Bluetooth necessária."); return;
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) { call.reject("Este aparelho não possui Bluetooth."); return; }
        if (!adapter.isEnabled()) { call.reject("Bluetooth está desligado."); return; }
        JSObject result = new JSObject();
        com.getcapacitor.JSArray devices = new com.getcapacitor.JSArray();
        for (BluetoothDevice d : adapter.getBondedDevices()) {
            JSObject item = new JSObject();
            item.put("name", safeName(d));
            item.put("address", d.getAddress());
            item.put("type", "classic");
            devices.put(item);
        }
        result.put("devices", devices);
        call.resolve(result);
    }

    @PluginMethod public void choosePrinter(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            call.reject("Permissão de Bluetooth necessária."); return;
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) { call.reject("Este aparelho não possui Bluetooth."); return; }
        if (!adapter.isEnabled()) { call.reject("Bluetooth está desligado."); return; }
        final List<BluetoothDevice> devices = new ArrayList<>(adapter.getBondedDevices());
        if (devices.isEmpty()) {
            call.reject("Nenhuma impressora Bluetooth pareada."); return;
        }
        final String[] labels = new String[devices.size()];
        for (int i=0;i<devices.size();i++) labels[i]=safeName(devices.get(i))+"\n"+devices.get(i).getAddress();
        getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
            .setTitle("Escolha a impressora térmica").setItems(labels, (dialog, which) -> {
                BluetoothDevice d=devices.get(which);
                selectedAddress=d.getAddress(); selectedName=safeName(d); saveSelected();
                JSObject result=new JSObject();
                result.put("name",selectedName); result.put("address",selectedAddress); result.put("type","classic");
                call.resolve(result);
            }).setNegativeButton("Cancelar",(dialog,which)->call.reject("Seleção cancelada."))
            .setOnCancelListener(dialog->call.reject("Seleção cancelada.")).show());
    }

    @PluginMethod public void connect(PluginCall call) {
        String address=call.getString("address",selectedAddress);
        if (address==null || address.trim().isEmpty()) { call.reject("Nenhuma impressora selecionada."); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            call.reject("Permissão de Bluetooth necessária."); return;
        }
        io.execute(() -> {
            try {
                BluetoothAdapter adapter=BluetoothAdapter.getDefaultAdapter();
                BluetoothDevice device=adapter.getRemoteDevice(address);
                closeSocket();
                BluetoothSocket s=device.createRfcommSocketToServiceRecord(SPP_UUID);
                s.connect(); socket=s; output=s.getOutputStream();
                selectedAddress=address; selectedName=safeName(device); saveSelected();
                JSObject result=new JSObject(); result.put("connected",true); result.put("name",selectedName); result.put("address",selectedAddress);
                call.resolve(result);
            } catch(Exception e) { closeSocket(); call.reject("Não foi possível conectar à impressora: "+e.getMessage(),e); }
        });
    }

    @PluginMethod public void write(PluginCall call) {
        String base64=call.getString("data","");
        if (base64==null || base64.isEmpty()) { call.reject("Nenhum dado de impressão recebido."); return; }
        io.execute(() -> {
            try {
                if (output==null || socket==null || !socket.isConnected()) throw new IOException("Impressora não conectada");
                output.write(android.util.Base64.decode(base64,android.util.Base64.DEFAULT)); output.flush(); call.resolve();
            } catch(Exception e) { call.reject("Falha ao enviar para a impressora: "+e.getMessage(),e); }
        });
    }

    @PluginMethod public void disconnect(PluginCall call) { io.execute(() -> { closeSocket(); call.resolve(); }); }

    @PluginMethod public void getSelected(PluginCall call) {
        JSObject r=new JSObject(); r.put("name",selectedName); r.put("address",selectedAddress);
        r.put("connected",socket!=null && socket.isConnected()); call.resolve(r);
    }

    @PluginMethod public void testPrint(PluginCall call) {
        io.execute(() -> {
            try {
                if (output==null || socket==null || !socket.isConnected()) throw new IOException("Impressora não conectada");
                output.write(new byte[]{0x1B,0x40});
                output.write(new byte[]{0x1B,0x61,0x01});
                output.write("BLOCO DE NOTAS\n".getBytes("CP437"));
                output.write("Teste de impressora OK\n\n".getBytes("CP437"));
                output.write(new byte[]{0x1D,0x56,0x41,0x03}); output.flush(); call.resolve();
            } catch(Exception e) { call.reject("Teste de impressão falhou: "+e.getMessage(),e); }
        });
    }

    private void saveSelected() {
        getContext().getSharedPreferences("bloco_printer",0).edit().putString("address",selectedAddress).putString("name",selectedName).apply();
    }
    private String safeName(BluetoothDevice d) {
        try { String n=d.getName(); return n==null || n.trim().isEmpty() ? "Impressora Bluetooth" : n; }
        catch(SecurityException e) { return "Impressora Bluetooth"; }
    }
    private synchronized void closeSocket() {
        try { if(output!=null) output.close(); } catch(Exception ignored) {}
        try { if(socket!=null) socket.close(); } catch(Exception ignored) {}
        output=null; socket=null;
    }
    @Override protected void handleOnDestroy() { closeSocket(); io.shutdownNow(); super.handleOnDestroy(); }
}