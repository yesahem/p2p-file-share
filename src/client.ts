//client.ts
import net from "node:net"


const client = net.createConnection({ port: 3002 }, () => {
  console.log("client connected to server on port 3002")
})

client.on("data", (data) => {
  console.log(`Data received is : ${data}`)
  console.log("Data sent is : 'Hello there'")
  client.write("hello there")
  // client.end()
})

client.on('end', () => {
  console.log('connection ended from server');
});