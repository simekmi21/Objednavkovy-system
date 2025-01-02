const express = require('express'); // Importuje framework Express pro snadnou tvorbu webového serveru
const bodyParser = require('body-parser'); // Middleware pro parsování těla HTTP požadavků ve formátu JSON
const cors = require('cors'); // Middleware pro povolení Cross-Origin Resource Sharing (CORS)

const app = express(); // Vytvoření instance aplikace Express
app.use(bodyParser.json()); // Registrace middleware pro parsování JSON v těle požadavků
app.use(cors()); // Povolení CORS pro všechny zdroje

// Pole pro uchování objednávek a proměnná pro generování unikátních ID
let orders = [];
let currentId = 1;

// Přidání nové objednávky
app.post('/api/orders', (req, res) => {
  const { tableNumber, items } = req.body; // Dekonstrukce těla požadavku pro získání čísla stolu a položek
  const order = { id: currentId++, tableNumber, items, status: 'pending' }; // Vytvoření nové objednávky s unikátním ID
  orders.push(order); // Uložení objednávky do pole
  res.status(201).json(order); // Odeslání odpovědi s kódem 201 (vytvořeno) a daty objednávky
});

// Načtení všech objednávek
app.get('/api/orders', (req, res) => {
  res.json(orders); // Odeslání všech aktuálních objednávek jako odpovědi ve formátu JSON
});

// Aktualizace stavu objednávky
app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params; // Získání ID objednávky z parametrů URL
  const { status } = req.body; // Získání nového stavu objednávky z těla požadavku

  const order = orders.find(o => o.id === parseInt(id)); // Vyhledání objednávky podle ID
  if (!order) return res.status(404).send('Order not found'); // Odeslání chyby 404, pokud objednávka nebyla nalezena

  order.status = status; // Aktualizace stavu objednávky
  res.json(order); // Odeslání aktualizované objednávky jako odpovědi
});

// Vyčištění všech objednávek (pro testování)
app.delete('/api/orders', (req, res) => {
  orders = []; // Vyprázdnění pole objednávek
  currentId = 1; // Resetování čítače ID
  res.send('All orders deleted.'); // Odeslání potvrzení
});

// Spuštění serveru
const PORT = process.env.PORT || 3000; // Definice portu, přednostně z prostředí, jinak výchozí 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Spuštění serveru a výpis informace do konzole
