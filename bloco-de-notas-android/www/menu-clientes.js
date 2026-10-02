(function () {
  "use strict";

  var CLIENTS_KEY = "portuga.clientes.tabs.v2";
  var ORDERS_KEY = "blocoPedidos.pedidos";
  var activeClientId = null;
  var lastSignature = "";

  function normalize(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function keyName(value) {
    return normalize(value).toLocaleLowerCase("pt-BR");
  }

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "");
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function readClients() {
    var list = readJson(CLIENTS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveClients(list) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
  }

  function readOrders() {
    var list = readJson(ORDERS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function getClientOrders(client) {
    var wanted = keyName(client.name);
    return readOrders()
      .filter(function (order) {
        return keyName(order && order.cliente) === wanted;
      })
      .sort(function (a, b) {
        return Number(b.criadoEm || 0) - Number(a.criadoEm || 0);
      });
  }

  function getClientTotal(client) {
    return getClientOrders(client).reduce(function (sum, order) {
      return sum + Number(order && order.valor || 0);
    }, 0);
  }

  function getEditableOrder(client) {
    var orders = getClientOrders(client);
    if (!orders.length) return null;

    var open = orders.find(function (order) {
      return order && order.status !== "entregue";
    });

    return open || orders[0];
  }

  function upsertClient(name, phone, address) {
    name = normalize(name);
    if (!name) return null;

    var clients = readClients();
    var found = clients.find(function (item) {
      return keyName(item.name) === keyName(name);
    });

    if (!found) {
      found = {
        id: "cli_" + Date.now().toString(36),
        name: name,
        phone: normalize(phone),
        address: normalize(address),
        createdAt: Date.now()
      };
      clients.unshift(found);
    } else {
      found.name = name;
      if (phone) found.phone = normalize(phone);
      if (address) found.address = normalize(address);
      found.updatedAt = Date.now();
    }

    saveClients(clients);
    activeClientId = found.id;
    return found;
  }

  function getOrdersButton() {
    var buttons = document.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      if (normalize(buttons[i].textContent) === "Pedidos") return buttons[i];
    }
    return null;
  }

  function isOrdersView() {
    var button = getOrdersButton();
    return !!button && button.getAttribute("aria-pressed") === "true";
  }

  function callOrderApi(method, arg1, arg2, arg3) {
    var api = window.PortugaOrders;
    if (api && typeof api[method] === "function") {
      api[method](arg1, arg2, arg3);
      return true;
    }
    setTimeout(function () {
      var retry = window.PortugaOrders;
      if (retry && typeof retry[method] === "function") {
        retry[method](arg1, arg2, arg3);
      }
    }, 180);
    return false;
  }

  function openClient(client) {
    activeClientId = client.id;
    var order = getEditableOrder(client);

    if (order) {
      callOrderApi("edit", order.id);
    } else {
      callOrderApi("newForClient", client.name, client.phone || "", client.address || "");
    }

    renderAll();
  }

  function addClient() {
    var name = normalize(prompt("Nome do cliente:"));
    if (!name) return;

    var phone = normalize(prompt("WhatsApp do cliente (opcional):", ""));
    var address = normalize(prompt("Endereço (opcional):", ""));
    var client = upsertClient(name, phone, address);

    if (client) openClient(client);
  }

  function removeClient(client) {
    if (!client) return;

    if (!confirm(
      "Remover a aba de " + client.name +
      "?\nOs pedidos já registrados continuam salvos no aparelho."
    )) return;

    saveClients(readClients().filter(function (item) {
      return item.id !== client.id;
    }));

    if (activeClientId === client.id) activeClientId = null;

    renderAll();
  }

  function renderSummary(bar, client) {
    var old = bar.querySelector(".pct-summary");
    if (old) old.remove();
    if (!client) return;

    var orders = getClientOrders(client);
    var total = getClientTotal(client);

    var card = document.createElement("section");
    card.className = "pct-summary";

    var top = document.createElement("div");
    top.className = "pct-summary-heading";

    var title = document.createElement("div");
    title.className = "pct-summary-title";

    var strong = document.createElement("strong");
    strong.textContent = "Comanda de " + client.name;

    var hint = document.createElement("small");
    hint.textContent = orders.length
      ? "Adicione itens sem criar outra comanda para este cliente."
      : "Esta aba ficará vinculada ao cliente para os próximos pedidos.";

    title.appendChild(strong);
    title.appendChild(hint);

    var amount = document.createElement("div");
    amount.className = "pct-summary-total";
    amount.textContent = money(total);

    top.appendChild(title);
    top.appendChild(amount);
    card.appendChild(top);

    var actions = document.createElement("div");
    actions.className = "pct-summary-actions";

    var addItems = document.createElement("button");
    addItems.type = "button";
    addItems.className = "pct-primary-action";
    addItems.textContent = orders.length ? "＋ Adicionar itens à comanda" : "＋ Criar primeiro pedido";
    addItems.onclick = function () {
      activeClientId = client.id;
      var current = getEditableOrder(client);
      if (current) {
        callOrderApi("edit", current.id);
      } else {
        callOrderApi("newForClient", client.name, client.phone || "", client.address || "");
      }
      renderAll();
    };

    var details = document.createElement("button");
    details.type = "button";
    details.className = "pct-secondary-action";
    details.textContent = "Ver pedidos da comanda";
    details.onclick = function () {
      showClientDetails(client);
    };

    actions.appendChild(addItems);
    actions.appendChild(details);
    card.appendChild(actions);

    bar.appendChild(card);
  }

  function showClientDetails(client) {
    var orders = getClientOrders(client);

    var backdrop = document.createElement("div");
    backdrop.className = "pct-modal-backdrop";

    var box = document.createElement("div");
    box.className = "pct-modal";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "pct-modal-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Fechar");
    close.onclick = function () { backdrop.remove(); };

    var title = document.createElement("h2");
    title.textContent = "Comanda de " + client.name;

    var subtitle = document.createElement("p");
    subtitle.textContent =
      orders.length +
      (orders.length === 1 ? " pedido" : " pedidos") +
      " • subtotal " +
      money(getClientTotal(client));

    box.appendChild(close);
    box.appendChild(title);
    box.appendChild(subtitle);

    var list = document.createElement("div");
    list.className = "pct-order-list";

    if (!orders.length) {
      var empty = document.createElement("p");
      empty.className = "pct-empty";
      empty.textContent = "Nenhum pedido registrado nesta comanda.";
      list.appendChild(empty);
    } else {
      orders.forEach(function (order, index) {
        var row = document.createElement("div");
        row.className = "pct-order-row";

        var left = document.createElement("div");
        var code = document.createElement("strong");
        code.textContent =
          "#" + String(order.id || "").slice(-5).toUpperCase() +
          " • " + (index + 1);

        var when = document.createElement("small");
        when.textContent = new Date(Number(order.criadoEm || Date.now()))
          .toLocaleString("pt-BR");

        left.appendChild(code);
        left.appendChild(when);

        var right = document.createElement("div");
        right.className = "pct-row-right";

        var value = document.createElement("strong");
        value.textContent = money(order.valor);

        var edit = document.createElement("button");
        edit.type = "button";
        edit.className = "pct-mini-edit";
        edit.textContent = "Adicionar itens";
        edit.onclick = function () {
          activeClientId = client.id;
          callOrderApi("edit", order.id);
          backdrop.remove();
          renderAll();
        };

        right.appendChild(value);
        right.appendChild(edit);

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    }

    box.appendChild(list);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  }

  function renderAll() {
    injectStyle();
    installShell();

    var bar = document.getElementById("portuga-client-tabs");
    if (!bar) return;

    var visible = isOrdersView();
    bar.style.display = visible ? "block" : "none";
    if (!visible) return;

    var clients = readClients();
    var signature = JSON.stringify({
      clients: clients,
      active: activeClientId,
      orders: readOrders().map(function (order) {
        return [
          order.id,
          order.cliente,
          order.valor,
          order.criadoEm,
          order.status,
          order.atualizadoEm
        ];
      })
    });

    if (signature === lastSignature) return;
    lastSignature = signature;

    bar.innerHTML = "";

    var header = document.createElement("div");
    header.className = "pct-header";

    var heading = document.createElement("div");
    heading.className = "pct-title-wrap";

    var title = document.createElement("strong");
    title.textContent = "Clientes / Comandas";

    var subtitle = document.createElement("small");
    subtitle.textContent =
      "Uma aba por cliente • vários itens na mesma comanda • subtotal individual";

    heading.appendChild(title);
    heading.appendChild(subtitle);

    var add = document.createElement("button");
    add.type = "button";
    add.className = "pct-add";
    add.textContent = "+ Cliente";
    add.onclick = addClient;

    header.appendChild(heading);
    header.appendChild(add);
    bar.appendChild(header);

    var strip = document.createElement("div");
    strip.className = "pct-strip";

    clients.forEach(function (client) {
      var orders = getClientOrders(client);
      var total = getClientTotal(client);

      var wrap = document.createElement("div");
      wrap.className = "pct-tab-wrap";

      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "pct-tab" + (activeClientId === client.id ? " active" : "");

      var name = document.createElement("span");
      name.className = "pct-name";
      name.textContent = client.name;

      var count = document.createElement("span");
      count.className = "pct-count";
      count.textContent =
        orders.length + (orders.length === 1 ? " pedido" : " pedidos");

      var totalEl = document.createElement("span");
      totalEl.className = "pct-total";
      totalEl.textContent = money(total);

      tab.appendChild(name);
      tab.appendChild(count);
      tab.appendChild(totalEl);
      tab.onclick = function () { openClient(client); };

      var close = document.createElement("button");
      close.type = "button";
      close.className = "pct-close";
      close.textContent = "×";
      close.title = "Remover aba";
      close.setAttribute("aria-label", "Remover aba de " + client.name);
      close.onclick = function (event) {
        event.stopPropagation();
        removeClient(client);
      };

      wrap.appendChild(tab);
      wrap.appendChild(close);
      strip.appendChild(wrap);
    });

    bar.appendChild(strip);

    var activeClient = clients.find(function (client) {
      return client.id === activeClientId;
    });

    renderSummary(bar, activeClient || null);
  }

  function installShell() {
    if (document.getElementById("portuga-client-tabs")) return;

    var bar = document.createElement("section");
    bar.id = "portuga-client-tabs";
    bar.setAttribute("aria-label", "Clientes e comandas");
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function injectStyle() {
    if (document.getElementById("portuga-client-style")) return;

    var style = document.createElement("style");
    style.id = "portuga-client-style";
    style.textContent = [
      "#portuga-client-tabs{position:relative;z-index:20;box-sizing:border-box;width:100%;background:linear-gradient(180deg,#17120a 0%,#21170b 100%);color:#fff;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 10px;border-bottom:1px solid rgba(212,175,55,.42);box-shadow:0 5px 18px rgba(0,0,0,.18)}",
      ".pct-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;width:100%;max-width:960px;margin:0 auto}",
      ".pct-title-wrap{min-width:0;padding-top:1px}",
      ".pct-title-wrap strong{display:block;color:#f5c542;font-size:18px;line-height:1.2;font-weight:900}",
      ".pct-title-wrap small{display:block;color:#d7d0c4;font-size:12px;line-height:1.35;margin-top:3px}",
      ".pct-add{flex:0 0 auto;border:1px solid #e5bd35;background:#e5bd35;color:#17120a;border-radius:14px;padding:10px 14px;font-weight:900;font-size:14px;min-height:44px}",
      ".pct-strip{display:flex;align-items:stretch;gap:8px;overflow-x:auto;overflow-y:hidden;padding:10px 0 3px;width:100%;max-width:960px;margin:0 auto;-webkit-overflow-scrolling:touch}",
      ".pct-strip::-webkit-scrollbar{display:none}",
      ".pct-tab-wrap{display:flex;flex:none;min-width:158px}",
      ".pct-tab{flex:1;min-width:0;border:1px solid #d4af37;border-right:0;border-radius:14px 0 0 14px;background:#fff;color:#242424;padding:9px 11px;text-align:left;box-shadow:none}",
      ".pct-tab.active{background:#e5bd35;color:#17120a}",
      ".pct-name,.pct-count,.pct-total{display:block}",
      ".pct-name{font-size:14px;font-weight:900;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pct-count{font-size:11px;opacity:.72;margin-top:3px}",
      ".pct-total{font-size:15px;font-weight:900;margin-top:3px;line-height:1.2}",
      ".pct-close{width:42px;border:1px solid #d4af37;border-radius:0 14px 14px 0;background:#fff;color:#666;font-size:21px;padding:0}",
      ".pct-tab.active+.pct-close{background:#e5bd35;color:#17120a}",
      ".pct-summary{width:100%;max-width:960px;margin:7px auto 2px;background:linear-gradient(135deg,#2a1d08,#120d07);border:1px solid rgba(212,175,55,.62);border-radius:16px;padding:12px;box-sizing:border-box}",
      ".pct-summary-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}",
      ".pct-summary-title{min-width:0}",
      ".pct-summary-title strong{display:block;color:#f5c542;font-size:16px;font-weight:900;line-height:1.2}",
      ".pct-summary-title small{display:block;color:#d7d0c4;font-size:11px;line-height:1.35;margin-top:4px}",
      ".pct-summary-total{font-size:19px;font-weight:900;color:#fff;white-space:nowrap}",
      ".pct-summary-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}",
      ".pct-summary-actions button{min-height:42px;border-radius:11px;padding:9px 10px;font-weight:900;font-size:12px}",
      ".pct-primary-action{border:1px solid #e5bd35;background:#e5bd35;color:#17120a}",
      ".pct-secondary-action{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff}",
      ".pct-modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0}",
      ".pct-modal{position:relative;width:100%;max-width:560px;max-height:88vh;overflow:auto;background:#fff;color:#222;border-radius:20px 20px 0 0;padding:20px;box-sizing:border-box;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}",
      ".pct-modal h2{margin:0;padding-right:38px;color:#17120a;font-size:21px;font-weight:900}",
      ".pct-modal>p{margin:6px 0 14px;color:#666;font-size:13px}",
      ".pct-modal-close{position:absolute;right:12px;top:12px;width:36px;height:36px;border:0;border-radius:50%;background:#f1f1f1;color:#555;font-size:23px}",
      ".pct-order-list{border-top:1px solid #e5e5e5}",
      ".pct-order-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #eee}",
      ".pct-order-row strong{display:block;color:#222;font-size:14px}",
      ".pct-order-row small{display:block;margin-top:3px;color:#777;font-size:11px}",
      ".pct-row-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}",
      ".pct-mini-edit{border:1px solid #d4af37;border-radius:9px;background:#fff8d9;color:#6b5200;padding:7px 9px;font-size:11px;font-weight:900}",
      ".pct-empty{color:#777;font-size:13px;padding:12px 0}",
      "@media (max-width:640px){.pct-title-wrap strong{font-size:17px}.pct-title-wrap small{font-size:11px;max-width:235px}.pct-add{padding:10px 12px}.pct-summary-actions{grid-template-columns:1fr}.pct-summary-total{font-size:18px}.pct-tab-wrap{min-width:150px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function start() {
    renderAll();

    var scheduled = false;
    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        renderAll();
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(renderAll, 1200);
    window.addEventListener("storage", renderAll);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) renderAll();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.PortugaClients = {
    addClient: addClient,
    refresh: renderAll,
    getActiveClient: function () {
      return {
        id: activeClientId,
        name: (readClients().find(function (client) {
          return client.id === activeClientId;
        }) || {}).name || ""
      };
    }
  };
})();