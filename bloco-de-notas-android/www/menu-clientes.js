(function () {
  "use strict";

  var CLIENTS_KEY = "portuga.clientes.tabs.v2";
  var ORDERS_KEY = "blocoPedidos.pedidos";
  var CATEGORIES = [
    ["lanches", "Lanches", "🍔"],
    ["porcoes", "Petiscos", "🍟"],
    ["pizzas", "Pizzas", "🍕"],
    ["bebidas", "Bebidas", "🥤"]
  ];
  var activeClientId = null;
  var activeClientName = "";
  var lastSignature = "";

  function normalizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function keyName(value) {
    return normalizeName(value).toLocaleLowerCase("pt-BR");
  }

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function readClients() {
    try {
      var list = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveClients(list) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
  }

  function readOrders() {
    try {
      var list = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function getClientOrders(client) {
    var wanted = keyName(client.name);
    return readOrders()
      .filter(function (order) {
        return keyName(order && order.cliente) === wanted;
      })
      .sort(function (a, b) {
        return Number(a.criadoEm || 0) - Number(b.criadoEm || 0);
      });
  }

  function getClientTotal(client) {
    return getClientOrders(client).reduce(function (sum, order) {
      return sum + Number(order && order.valor || 0);
    }, 0);
  }

  function upsertClient(name, phone, address) {
    name = normalizeName(name);
    if (!name) return null;

    var clients = readClients();
    var found = clients.find(function (item) {
      return keyName(item.name) === keyName(name);
    });

    if (!found) {
      found = {
        id: "cli_" + Date.now().toString(36),
        name: name,
        phone: normalizeName(phone),
        address: normalizeName(address),
        createdAt: Date.now()
      };
      clients.unshift(found);
    } else {
      found.name = name;
      if (phone) found.phone = normalizeName(phone);
      if (address) found.address = normalizeName(address);
      found.updatedAt = Date.now();
    }

    saveClients(clients);
    activeClientId = found.id;
    activeClientName = found.name;
    return found;
  }

  function findButton(label) {
    var buttons = document.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      if (normalizeName(buttons[i].textContent) === label) return buttons[i];
    }
    return null;
  }

  function findOrderInput(placeholder) {
    return document.querySelector('input[placeholder="' + placeholder + '"]');
  }

  function setReactInput(input, value) {
    if (!input) return;
    var descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openOrderForm() {
    var input = findOrderInput("Ex.: Maria Silva");
    if (input) return input;
    var newOrder = findButton("Novo pedido");
    if (newOrder) {
      newOrder.click();
      return null;
    }
    return null;
  }

  function activateClient(client) {
    activeClientId = client.id;
    activeClientName = client.name;
    var input = openOrderForm();

    if (!input) {
      setTimeout(function () { activateClient(client); }, 140);
      return;
    }

    setReactInput(input, client.name);

    var phone = findOrderInput("Ex.: 11987654321");
    if (phone && client.phone) setReactInput(phone, client.phone);

    var address = findOrderInput("Endereço de entrega (opcional)");
    if (address && client.address) setReactInput(address, client.address);

    renderAll();
    input.focus();
  }

  function addClient() {
    var name = prompt("Nome do cliente:");
    name = normalizeName(name);
    if (!name) return;

    var phone = prompt("WhatsApp do cliente (opcional):", "");
    var address = prompt("Endereço (opcional):", "");
    var client = upsertClient(name, phone, address);

    if (client) activateClient(client);
  }

  function removeClient(client) {
    if (!client) return;
    if (!confirm(
      "Remover a aba de " + client.name +
      "?\nOs pedidos já registrados continuam no histórico."
    )) return;

    saveClients(readClients().filter(function (item) {
      return item.id !== client.id;
    }));

    if (activeClientId === client.id) {
      activeClientId = null;
      activeClientName = "";
    }

    renderAll();
  }

  function renderClientTabs() {
    var bar = document.getElementById("portuga-client-tabs");
    if (!bar) return;

    var clients = readClients();
    var ordersButton = findButton("Pedidos");
    var isOrdersView =
      ordersButton &&
      ordersButton.getAttribute("aria-pressed") === "true";

    bar.style.display = isOrdersView ? "block" : "none";
    if (!isOrdersView) return;

    var signature = JSON.stringify({
      clients: clients,
      active: activeClientId,
      orders: readOrders().map(function (o) {
        return [o.id, o.cliente, o.valor, o.criadoEm, o.status];
      })
    });

    if (signature === lastSignature) return;
    lastSignature = signature;

    bar.innerHTML = "";

    var header = document.createElement("div");
    header.className = "pct-header";

    var titleWrap = document.createElement("div");
    titleWrap.className = "pct-title-wrap";

    var title = document.createElement("strong");
    title.textContent = "Clientes / Comandas";

    var subtitle = document.createElement("small");
    subtitle.textContent =
      "Uma aba por cliente • vários pedidos na mesma comanda • subtotal individual";

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    var add = document.createElement("button");
    add.type = "button";
    add.className = "pct-add";
    add.textContent = "+ Cliente";
    add.onclick = addClient;

    header.appendChild(titleWrap);
    header.appendChild(add);
    bar.appendChild(header);

    var strip = document.createElement("div");
    strip.className = "pct-strip";

    clients.forEach(function (client) {
      var orders = getClientOrders(client);
      var total = orders.reduce(function (sum, order) {
        return sum + Number(order && order.valor || 0);
      }, 0);

      var wrap = document.createElement("div");
      wrap.className = "pct-tab-wrap";

      var tab = document.createElement("button");
      tab.type = "button";
      tab.className =
        "pct-tab" + (activeClientId === client.id ? " active" : "");

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
      tab.onclick = function () { activateClient(client); };

      var close = document.createElement("button");
      close.type = "button";
      close.className = "pct-close";
      close.textContent = "×";
      close.title = "Remover aba";
      close.onclick = function (event) {
        event.stopPropagation();
        removeClient(client);
      };

      wrap.appendChild(tab);
      wrap.appendChild(close);
      strip.appendChild(wrap);
    });

    bar.appendChild(strip);
    renderClientSummary(clients);
  }

  function renderClientSummary(clients) {
    var old = document.getElementById("portuga-client-summary");
    if (old) old.remove();

    if (!activeClientId) return;

    var client = clients.find(function (item) {
      return item.id === activeClientId;
    });

    if (!client) return;

    var orders = getClientOrders(client);
    var total = orders.reduce(function (sum, order) {
      return sum + Number(order && order.valor || 0);
    }, 0);

    var card = document.createElement("section");
    card.id = "portuga-client-summary";
    card.className = "pct-summary";

    var heading = document.createElement("div");
    heading.className = "pct-summary-heading";

    var left = document.createElement("div");
    var title = document.createElement("strong");
    title.textContent = "Comanda de " + client.name;

    var hint = document.createElement("small");
    hint.textContent =
      "Subtotal individual desta comanda. O faturamento geral continua sendo calculado pela lista de pedidos.";

    left.appendChild(title);
    left.appendChild(hint);

    var totalEl = document.createElement("div");
    totalEl.className = "pct-summary-total";
    totalEl.textContent = money(total);

    heading.appendChild(left);
    heading.appendChild(totalEl);
    card.appendChild(heading);

    var actions = document.createElement("div");
    actions.className = "pct-summary-actions";

    var newOrder = document.createElement("button");
    newOrder.type = "button";
    newOrder.textContent = "＋ Novo pedido para " + client.name;
    newOrder.onclick = function () { activateClient(client); };

    var details = document.createElement("button");
    details.type = "button";
    details.textContent = "Ver pedidos desta comanda";
    details.onclick = function () { showClientDetails(client); };

    actions.appendChild(newOrder);
    actions.appendChild(details);
    card.appendChild(actions);

    var root = document.getElementById("root");
    if (root && root.parentNode) root.parentNode.insertBefore(card, root);
  }

  function showClientDetails(client) {
    var orders = getClientOrders(client);

    var modal = document.createElement("div");
    modal.className = "pct-modal-backdrop";

    var box = document.createElement("div");
    box.className = "pct-modal";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "pct-modal-close";
    close.textContent = "×";
    close.onclick = function () { modal.remove(); };

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
      empty.textContent =
        "Ainda não existem pedidos registrados para este cliente.";
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

        var right = document.createElement("strong");
        right.textContent = money(order.valor);

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    }

    box.appendChild(list);
    modal.appendChild(box);
    document.body.appendChild(modal);
  }

  function injectClientFromCurrentForm() {
    var nameInput = findOrderInput("Ex.: Maria Silva");
    if (!nameInput) return;

    var name = normalizeName(nameInput.value);
    if (!name) return;

    var phone = findOrderInput("Ex.: 11987654321");
    var address = findOrderInput("Endereço de entrega (opcional)");

    var client = upsertClient(
      name,
      phone && phone.value,
      address && address.value
    );

    if (client) {
      activeClientId = client.id;
      activeClientName = client.name;
    }
  }

  function watchNewOrderButton() {
    var buttons = document.querySelectorAll("button");

    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if (button.dataset.portugaClientHook === "1") continue;

      if (normalizeName(button.textContent) === "Adicionar pedido") {
        button.dataset.portugaClientHook = "1";
        button.addEventListener("click", function () {
          injectClientFromCurrentForm();
          setTimeout(renderAll, 220);
        }, true);
      }
    }
  }

  function installCategoryTabs() {
    var selects = document.querySelectorAll("select");

    for (var i = 0; i < selects.length; i++) {
      var select = selects[i];
      if (select.dataset.portugaCategoryTabs === "1") continue;

      var groups = select.querySelectorAll("optgroup");
      if (groups.length < 3) continue;

      select.dataset.portugaCategoryTabs = "1";

      for (var g = 0; g < groups.length; g++) {
        if (groups[g].label === "Porções") groups[g].label = "Petiscos";
      }

      var tabs = document.createElement("div");
      tabs.className = "pct-categories";

      CATEGORIES.forEach(function (category, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = category[2] + " " + category[1];

        button.onclick = function () {
          for (var j = 0; j < groups.length; j++) {
            var label =
              (groups[j].getAttribute("label") || "").toLowerCase();
            var wanted = category[1].toLowerCase();

            groups[j].style.display =
              label === wanted ||
              (category[0] === "porcoes" && label === "porções")
                ? ""
                : "none";
          }

          var all = tabs.querySelectorAll("button");
          for (var k = 0; k < all.length; k++) {
            all[k].classList.toggle("active", all[k] === button);
          }

          select.value = "";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        };

        tabs.appendChild(button);
        if (index === 0) setTimeout(function () { button.click(); }, 0);
      });

      if (select.parentNode) select.parentNode.insertBefore(tabs, select);
    }
  }

  function installShell() {
    if (!document.getElementById("portuga-client-tabs")) {
      var bar = document.createElement("section");
      bar.id = "portuga-client-tabs";
      bar.style.display = "none";
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  function injectStyle() {
    if (document.getElementById("portuga-client-style")) return;

    var style = document.createElement("style");
    style.id = "portuga-client-style";
    style.textContent = [
      "#portuga-client-tabs{position:sticky;top:0;z-index:28;background:linear-gradient(180deg,#17120a,#21170b);color:#fff;padding:10px 12px;border-bottom:1px solid rgba(212,175,55,.4);box-shadow:0 4px 18px rgba(0,0,0,.16)}",
      ".pct-header{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:960px;margin:0 auto}",
      ".pct-title-wrap strong{display:block;color:#f5c542;font-size:14px;font-weight:900}",
      ".pct-title-wrap small{display:block;color:#d7d0c4;font-size:11px;margin-top:2px;line-height:1.35}",
      ".pct-add{border:1px solid #d4af37;background:#d4af37;color:#17120a;border-radius:12px;padding:9px 12px;font-weight:900;white-space:nowrap}",
      ".pct-strip{display:flex;gap:7px;overflow-x:auto;padding:8px 0 2px;max-width:960px;margin:0 auto}",
      ".pct-tab-wrap{display:flex;flex:none}",
      ".pct-tab{min-width:132px;border:1px solid #d4af37;border-right:0;border-radius:12px 0 0 12px;background:#fff;color:#262626;padding:9px 10px;text-align:left}",
      ".pct-tab.active{background:#d4af37;color:#17120a}",
      ".pct-name,.pct-count,.pct-total{display:block}",
      ".pct-name{font-size:12px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}",
      ".pct-count{font-size:10px;opacity:.72;margin-top:2px}",
      ".pct-total{font-size:13px;font-weight:900;margin-top:3px}",
      ".pct-close{border:1px solid #d4af37;border-radius:0 12px 12px 0;background:#fff;color:#777;padding:0 8px;font-size:18px}",
      ".pct-tab.active+.pct-close{background:#d4af37;color:#17120a}",
      ".pct-summary{margin:10px auto 14px;max-width:960px;background:linear-gradient(135deg,#241a08,#120d07);color:#fff;border:1px solid rgba(212,175,55,.55);border-radius:18px;padding:14px;box-shadow:0 5px 20px rgba(0,0,0,.1)}",
      ".pct-summary-heading{display:flex;align-items:center;justify-content:space-between;gap:15px}",
      ".pct-summary-heading strong{display:block;font-size:16px;color:#f5c542}",
      ".pct-summary-heading small{display:block;margin-top:4px;color:#d7d0c4;font-size:11px;line-height:1.35;max-width:640px}",
      ".pct-summary-total{font-size:22px;font-weight:900;white-space:nowrap;color:#fff}",
      ".pct-summary-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}",
      ".pct-summary-actions button{border:1px solid #d4af37;background:#d4af37;color:#17120a;border-radius:11px;padding:10px;font-weight:900}",
      ".pct-summary-actions button+button{background:rgba(255,255,255,.08);color:#fff}",
      ".pct-categories{display:flex;gap:6px;overflow-x:auto;padding:6px 0 8px}",
      ".pct-categories button{flex:none;border:1px solid #e5e5e5;background:#f5f5f5;color:#525252;border-radius:10px;padding:8px 11px;font-weight:900;font-size:12px}",
      ".pct-categories button.active{background:#d4af37;border-color:#d4af37;color:#17120a}",
      ".pct-modal-backdrop{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:0}",
      ".pct-modal{position:relative;width:100%;max-width:520px;max-height:88vh;overflow:auto;background:#fff;border-radius:20px 20px 0 0;padding:20px}",
      ".pct-modal h2{margin:0;color:#17120a;font-size:21px;font-weight:900;padding-right:30px}",
      ".pct-modal>p{margin:6px 0 14px;color:#666;font-size:13px}",
      ".pct-modal-close{position:absolute;right:12px;top:12px;border:0;background:#f3f3f3;border-radius:50%;width:34px;height:34px;font-size:22px;color:#555}",
      ".pct-order-list{border-top:1px solid #e5e5e5}",
      ".pct-order-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #eee}",
      ".pct-order-row strong{display:block;color:#222;font-size:14px}",
      ".pct-order-row small{display:block;margin-top:3px;color:#777;font-size:11px}",
      ".pct-empty{color:#777;font-size:13px;padding:12px 0}",
      "@media (max-width:640px){.pct-summary-actions{grid-template-columns:1fr}.pct-summary-total{font-size:19px}.pct-header{align-items:flex-start}}"
    ].join("");
    document.head.appendChild(style);
  }

  function renderAll() {
    injectStyle();
    installShell();
    installCategoryTabs();
    watchNewOrderButton();
    renderClientTabs();
  }

  function start() {
    renderAll();
    var observer = new MutationObserver(function () {
      window.requestAnimationFrame(renderAll);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(renderAll, 1400);
    window.addEventListener("storage", renderAll);
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
      return { id: activeClientId, name: activeClientName };
    }
  };
})();