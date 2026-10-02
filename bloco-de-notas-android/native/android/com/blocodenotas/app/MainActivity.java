package com.blocodenotas.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        registerPlugin(PortugaShellPlugin.class);
        super.onCreate(savedInstanceState);
    }
}