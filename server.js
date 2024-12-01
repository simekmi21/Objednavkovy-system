const express = require('express'); // Importuje framework Express pro vytvoření HTTP serveru
const bodyParser = require('body-parser'); // Middleware pro parsování JSON těla požadavků
const axios = require('axios'); // Knihovna pro HTTP požadavky, použitá zde pro Arduino Cloud integraci

const app = express(); // Vytvoření instance aplikace Express
app.use(bodyParser.json()); // Nastavení middleware pro parsování JSON dat

const cors = require('cors'); // Middleware pro povolení CORS
app.use(cors({
  origin: 'https://jamar88.github.io' // Povolit přístup pouze z GitHub Pages na této adrese
}));

// Paměťová databáze pro ukládání objednávek
const orders = []; // Pole sloužící jako úložiště objednávek
let currentId = 1; // Počítadlo pro generování unikátních ID objednávek

// Endpoint pro přidání nové objednávky
app.post('/api/orders', (req, res) => {
  const { tableNumber, items } = req.body; // Získání dat z těla požadavku
  const order = { id: currentId++, tableNumber, items, status: 'pending' }; // Sestavení nové objednávky
  orders.push(order); // Uložení objednávky do paměti
  console.log(`Přidána nová objednávka: ${JSON.stringify(order)}`); // Logování přidané objednávky
  res.status(201).json(order); // Odeslání vytvořené objednávky zpět klientovi
});

// Endpoint pro načtení všech objednávek
app.get('/api/orders', (req, res) => {
  console.log('Načítám všechny objednávky'); // Logování akce
  res.json(orders); // Vrácení všech objednávek jako JSON odpověď
});

// Endpoint pro aktualizaci stavu objednávky
app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params; // Získání ID objednávky z URL parametru
  const { status } = req.body; // Získání nového stavu z těla požadavku

  console.log(`Přijat PATCH požadavek: objednávka ID ${id}, nový stav: ${status}`); // Logování požadavku

  // Vyhledání objednávky podle ID
  const order = orders.find(o => o.id === parseInt(id));
  if (!order) {
    console.error(`Objednávka s ID ${id} nenalezena.`); // Logování chyby, pokud objednávka nebyla nalezena
    return res.status(404).json({ error: 'Order not found' }); // Vrácení chyby klientovi
  }

  // Aktualizace stavu objednávky
  order.status = status;
  console.log(`Objednávka ID ${id} aktualizována na stav: ${status}`); // Logování změny stavu

  // Arduino Cloud API - nastavení proměnné
  const ARDUINO_API_KEY = process.env.ARDUINO_API_KEY; // API klíč z prostředí
  const THING_ID = 'aeaf1532-0f5d-4a4e-9ae8-a6fcbbd24834'; // Unikátní ID Thing z Arduino Cloudu
  const PROPERTY_ID = '395adbdb-b8b9-44cb-a08a-aa9a069e87f3'; // ID proměnné orderStatus

  try {
    // Odeslání HTTP PUT požadavku na Arduino Cloud
    const arduinoResponse = await axios.put(
      `https://api2.arduino.cc/iot/v2/things/${THING_ID}/properties/${PROPERTY_ID}`, // URL pro požadavek
      {
        value: `Objednávka ${order.id}: ${status === 'completed' ? 'K výdeji' : status}`, // Nová hodnota proměnné
      },
      {
        headers: {
          Authorization: `Bearer ${ARDUINO_API_KEY}`, // Autorizace pomocí Bearer tokenu
        },
      }
    );

    console.log('Arduino Cloud Response:', arduinoResponse.data); // Logování odpovědi z Arduino Cloudu

    // Odeslání aktualizované objednávky jako odpověď
    res.json({
      message: 'Order updated successfully', // Zpráva pro klienta
      order: {
        id: order.id,
        tableNumber: order.tableNumber,
        status: order.status, // Aktualizovaný stav objednávky
      }
    });
  } catch (error) {
    console.error('Error updating Arduino Cloud:', error.message); // Logování chyby při aktualizaci Arduino Cloudu
    res.status(500).json({ error: 'Chyba při aktualizaci Arduino Cloudu' }); // Vrácení chyby klientovi
  }
});

// Spuštění serveru na zvoleném portu
const PORT = process.env.PORT || 3000; // Nastavení portu z proměnných prostředí, výchozí je 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Logování spuštění serveru
