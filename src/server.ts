//server.ts 
import net from "node:net"

const server = net.createServer((socket) => {
  console.log("Connection established")
  console.log("Data sent is : 'Thanks for contacting this server' ")
  socket.write("Thanks for contacting this server")
  
  
  socket.on("data", (data) => {
    console.log(`data received is ${data}`)
  })

  socket.on("end", () => {
    console.log("connection ended")
  })

})

server.listen(3002, "localhost", () => {
  console.log("server is running in PORT 3002")
} )