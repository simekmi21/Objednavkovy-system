#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Max72xxPanel.h>
#include <DFRobotDFPlayerMini.h>
#include <vector>
#include <map>

// Wi-Fi přihlašovací údaje
const char* ssid = "SSID"; // Zadat název mojí Wi-Fi sítě
const char* password = "PASS"; // Zadat heslo k mojí Wi-Fi

// Adresa API serveru
const char* serverName = "https://objednavkovy-system-backend.onrender.com/api/orders"; // URL serveru pro získávání objednávek

// Nastavení LED matice
const int pinCS = 5;      // Pin pro chip select na LED matici
const int hDisplays = 4;  // Počet horizontálních displejů
const int vDisplays = 1;  // Počet vertikálních displejů
Max72xxPanel matrix(pinCS, hDisplays, vDisplays);

// Nastavení DFPlayer Mini
HardwareSerial mySerial(1);  // Využití UART1 pro komunikaci
DFRobotDFPlayerMini myDFPlayer;

// Sledování zpracovaných objednávek a jejich počtu zobrazení
std::map<int, int> orderDisplayCounts;

void setup() {
  // Inicializace sériové komunikace
  Serial.begin(115200);
  mySerial.begin(9600, SERIAL_8N1, 16, 17); // RX na GPIO16, TX na GPIO17

  // Inicializace DFPlayer Mini
  if (!myDFPlayer.begin(mySerial)) {
    Serial.println(F("Inicializace DFPlayer selhala!"));
    while (true); // Zastavení programu při selhání inicializace
  }
  Serial.println(F("DFPlayer Mini je online."));
  myDFPlayer.volume(20);  // Nastavení hlasitosti (rozsah 0-30)

  // Připojení k Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("."); // Indikace čekání na připojení
  }
  Serial.println("\nWiFi připojeno!");

  // Inicializace LED matice
  matrix.setIntensity(1); // Nastavení jasu
  matrix.fillScreen(LOW); // Vymazání obrazovky
  matrix.write();

  // Otočení a mapování panelů LED matice
  for (int i = 0; i < hDisplays; i++) {
    matrix.setRotation(i, 1); // Otočení pro správnou orientaci
  }

  // Zobrazení úvodní zprávy
  displayMessage("System Ready");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName); // Inicializace HTTP klienta

    int httpResponseCode = http.GET(); // Odeslání GET požadavku
    if (httpResponseCode == 200) { // Pokud je odpověď 200 OK
      String response = http.getString();
      Serial.println("Odpověď serveru: " + response);
      handleServerResponse(response); // Zpracování odpovědi serveru
    } else {
      Serial.printf("Chyba: %d\n", httpResponseCode); // Výpis chyby
    }
    http.end(); // Ukončení HTTP požadavku
  } else {
    Serial.println("WiFi odpojeno!");
    WiFi.reconnect(); // Pokus o znovupřipojení k Wi-Fi
  }

  delay(5000); // Dotazování na server každých 5 sekund
}

void handleServerResponse(String response) {
  int orderStart = response.indexOf("{\"id\":");
  while (orderStart != -1) { // Zpracování jednotlivých objednávek
    int idStart = response.indexOf("\"id\":", orderStart) + 5;
    int idEnd = response.indexOf(",", idStart);
    int orderId = response.substring(idStart, idEnd).toInt();

    // Pokud objednávka ještě nebyla zpracována dvakrát
    if (orderDisplayCounts[orderId] < 2) {
      int statusIndex = response.indexOf("\"status\":\"completed\"", orderStart);
      if (statusIndex != -1) {
        int tableIndex = response.indexOf("\"tableNumber\":", orderStart) + 14;
        int tableEnd = response.indexOf(",", tableIndex);
        int tableNumber = response.substring(tableIndex, tableEnd).toInt();

        // Zobrazení a přehrání zvuku pouze jednou
        if (orderDisplayCounts[orderId] == 0) {
          playAudio(tableNumber); // Přehrání zvuku pro číslo stolu
        }

        notifyOrderReady(tableNumber); // Oznámení připravené objednávky
        orderDisplayCounts[orderId]++; // Zvýšení počtu zobrazení
      }
    }
    orderStart = response.indexOf("{\"id\":", orderStart + 1); // Pokračování na další objednávku
  }
}

void notifyOrderReady(int tableNumber) {
  // Zobrazení zprávy na LED matici
  String message = "Objednavka pro stul " + String(tableNumber) + " pripravena";
  displayMessage(message);

  // Vymazání obrazovky po zobrazení zprávy
  matrix.fillScreen(LOW);
  matrix.write();
}

void displayMessage(String text) {
  int textLength = text.length();
  int scrollWidth = textLength * 6 + hDisplays * 8; // Výpočet šířky pro posun
  for (int i = hDisplays * 8; i > -scrollWidth; i--) { // Posun zprávy zleva doprava
    matrix.fillScreen(LOW);
    matrix.setCursor(i, 0); // Nastavení kurzoru pro posun
    matrix.print(text);
    matrix.write();
    delay(50); // Nastavení rychlosti posunu
  }
}

void playAudio(int tableNumber) {
  if (tableNumber > 0 && tableNumber <= 8) {
    myDFPlayer.play(tableNumber); // Přehrání odpovídajícího MP3 souboru
    Serial.println("Přehrávám zvuk pro stůl: " + String(tableNumber));
  } else {
    Serial.println("Neplatné číslo stolu pro přehrání zvuku!");
  }
}
