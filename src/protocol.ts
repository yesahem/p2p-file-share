
export type Message =
  | {
      type: "HELLO";
      peerId: string;
      version: 1;
    }
  | {
      type: "PING";
    }
  | {
      type: "PONG";
  };


export function encodeMessage(message: Message): Buffer {
  /*  Requirements:
  1. Accept a Message.
  2. Serialize it to JSON.
  3. Convert the JSON string into a UTF-8 Buffer.
  4. Allocate a 4-byte header.
  5. Write the payload length as a big-endian unsigned integer.
  6. Return a single Buffer containing the header followed by the payload.
  */
  
  const header = Buffer.alloc(4)

  const serializedPayload = JSON.stringify(message)
  const bufferedData = Buffer.from(serializedPayload, "utf-8")

  console.log(bufferedData)
  
  header.writeUInt32BE(bufferedData.length, 0);

  return Buffer.concat([header, bufferedData])
}


encodeMessage({
  type: "PING"
})