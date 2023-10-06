const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAX_PLAYERS = 2; // Set the maximum number of players

const players = new Map();
const playerMoves = new Map();

let currentTurn = 1; // Player 1 starts
let gameState = 'making-move'; // Initial state is waiting for players to make moves

let nextAvailableRole = 'Player 1';

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));
       
// Function to send a message to all clients in the websocket server
function sendPlayerNumberToClients(wss, playerNumber) {
    // Iterate over the connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Send a message with the player number and message type "PLAYER_NUMBER"

        client.send(JSON.stringify({ type: "PLAYER_NUMBER", content: `Player ${playerNumber}` }));
      }
    });
  }
  
function sendGameStateToClients(wss, gameState) {
    // Iterate over the connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Send a message with the game state and message type "GAME_STATE"
        client.send(JSON.stringify({ type: "GAME_STATE", content: gameState }));
      }
    });
  }
  
wss.on('connection', (ws) => {

    if (players.size >= MAX_PLAYERS) {
        // Reject the connection if the maximum number of players is reached
        ws.send('Server: Maximum number of players reached. Try again later.');
        ws.close();
        return;
    }

    const playerRole = nextAvailableRole;
    nextAvailableRole = nextAvailableRole === 'Player 1' ? 'Player 2' : 'Player 1';

    // Store player data in the Map
    players.set(ws, {
        role: playerRole,
    });

    const player = players.get(ws);

    ws.send(JSON.stringify({ type: 'PLAYER_NUMBER', content: player.role }));

    console.log(`Player ${player.role} connected`);
    console.log("Total players: ", players.size)

    ws.on('message', (message) => {
        const messageString = message.toString('utf8');

        const playerData = players.get(ws);
        console.log(messageString)

        if (playerData) {
            const playerRole = playerData.role;
            console.log(`The player role is ${playerRole} \n`)
            const playerNumber = playerRole === 'Player 1' ? 1 : 2;

            const messageString = message.toString('utf8');
            
            if (gameState === 'making-move') {
                playerMoves.set(playerNumber, messageString);
                console.log(playerMoves)

            // Store the player's move in the map
            playerMoves.set(playerNumber, messageString);

            // Switch turns
            currentTurn = currentTurn === 1 ? 2 : 1;

            // Check if both players have made their moves
                if (playerMoves.has(1) && playerMoves.has(2)) {
                    // Compare moves and determine the outcome
                    const player1Move = playerMoves.get(1);
                    const player2Move = playerMoves.get(2);
                    let outcomeMessage = 'Both players made their moves: ';

                    if (player1Move === player2Move) {
                        outcomeMessage += "It's a tie!";
                    } else {
                        // Logic to determine the winner based on player moves
                        if (
                            (player1Move === 'Rock' && player2Move === 'Scissor') ||
                            (player1Move === 'Scissor' && player2Move === 'Paper') ||
                            (player1Move === 'Paper' && player2Move === 'Rock')
                        ) {
                            outcomeMessage += 'Player 1 wins!';
                        } else {
                            outcomeMessage += 'Player 2 wins!';
                        }
                    }

                    sendGameStateToClients(wss, outcomeMessage)


                    gameState = 'waiting';
                    
                    if (ws.readyState === ws.OPEN) {
                        ws.send(outcomeMessage);
                    }

                    setTimeout(() => {
                        playerMoves.clear();
                        gameState = 'making-move'; // Transition back to 'making-move'
                        outcomeMessage = 'New round has started. Select your move.';
                        sendGameStateToClients(wss, outcomeMessage);

                        console.log('New round has started.'); // Add a log message for clarity

                        // You can add any additional logic for starting a new round here
                    }, 5000); // Adjust the delay time as needed
            
                }  
            } 
        }
    });

    ws.on('close', () => {
        // Handle player disconnects here
        players.delete(ws);
    console.log(`Player ${playerRole} disconnected. Total players: ${players.size}`);
    });
});

// Specify the IP address and port
const IP_ADDRESS = '192.168.0.226'; // Replace with your desired IP address
const PORT = process.env.PORT || 8080;
server.listen(PORT, IP_ADDRESS, () => {
    console.log(`Servidor Node.js escuchando en ${IP_ADDRESS}:${PORT}`);
});
