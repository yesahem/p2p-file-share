# Build Your Own Peer-to-Peer File Sharing System in TypeScript

A step-by-step guide for beginners. It starts with an empty folder and ends with a working program you can run on two or more computers to share files directly between them, with no central server in the middle.

This guide contains **no code**. It explains the ideas, the decisions and the order of work. You write the code yourself, one stage at a time. Each stage ends with a checkpoint you can test, so you always know whether you are on track before you move on.

---

## Table of Contents

1. [What You Are Going to Build](#what-you-are-going-to-build)
2. [Before You Start](#before-you-start)
3. [How to Use This Guide](#how-to-use-this-guide)
4. [Part 1: The Concepts You Need](#part-1-the-concepts-you-need)
5. [Stage 1: Set Up Your Project](#stage-1-set-up-your-project)
6. [Stage 2: Your First Network Connection](#stage-2-your-first-network-connection)
7. [Stage 3: Design Your Protocol](#stage-3-design-your-protocol)
8. [Stage 4: Build the Message Encoder](#stage-4-build-the-message-encoder)
9. [Stage 5: Build the Message Decoder](#stage-5-build-the-message-decoder)
10. [Stage 6: Test Your Protocol](#stage-6-test-your-protocol)
11. [Stage 7: Wrap Each Connection](#stage-7-wrap-each-connection)
12. [Stage 8: The Handshake and the Heartbeat](#stage-8-the-handshake-and-the-heartbeat)
13. [Stage 9: Turn Your Program into a Real Peer](#stage-9-turn-your-program-into-a-real-peer)
14. [Stage 10: Design File Transfer](#stage-10-design-file-transfer)
15. [Stage 11: The Sharing Side](#stage-11-the-sharing-side)
16. [Stage 12: The Receiving Side](#stage-12-the-receiving-side)
17. [Stage 13: A Command-Line Interface](#stage-13-a-command-line-interface)
18. [Stage 14: Make It Robust](#stage-14-make-it-robust)
19. [Stage 15: Test the Whole System](#stage-15-test-the-whole-system)
20. [Going Further](#going-further)
21. [Troubleshooting](#troubleshooting)
22. [Glossary](#glossary)
23. [Milestone Checklist](#milestone-checklist)
24. [About This Repository](#about-this-repository)

---

## What You Are Going to Build

By the end of this guide you will have a single program, called a **peer**, that does all of the following:

- Listens for connections from other peers on a port you choose.
- Connects to other peers when you tell it their address.
- Introduces itself to every peer it connects to, and checks that both sides speak the same version of your protocol.
- Notices when another peer has gone silent or disconnected.
- Shares the files inside one folder on your computer (the **shared folder**).
- Shows you the list of files another peer is sharing.
- Downloads any of those files into a **downloads folder**, in small pieces, while showing progress.
- Checks that every downloaded file is an exact, uncorrupted copy of the original.
- Survives bad input from other peers without crashing.

You will run the same program in several terminal windows (or on several computers on the same network) and have them share files with each other.

### What "peer-to-peer" means here

In a normal website, many **clients** (browsers) talk to one **server**. The server holds the data and the clients only ask for it.

In a **peer-to-peer** (P2P) system, every participant is equal. Each peer is **both a server and a client at the same time**: it can accept connections and serve files, and it can also open connections and download files. There is no central computer that everything depends on. If one peer goes away, the others keep working.

Famous examples are BitTorrent and early file sharing programs. What you build here is a simpler version of the same idea.

---

## Before You Start

### What you should already know

- Basic TypeScript or JavaScript: variables, functions, objects, arrays, classes, and if/for/while statements.
- How to use a terminal: changing folders, running a command, stopping a program with Ctrl+C.
- What a callback or an async function is, roughly. This guide explains the event-driven parts as they come up.

You do **not** need to know anything about networking. Part 1 covers it.

### What you need installed

- **Bun**, a fast runtime for TypeScript and JavaScript. It runs TypeScript files directly, has a built-in test runner and supports Node's networking and file APIs. Install it from the official Bun website by following the instructions for your operating system.
- A code editor. Visual Studio Code is a good choice, because it understands TypeScript out of the box.
- Optionally, a second computer on the same Wi-Fi or wired network. Everything can also be done on one computer with several terminal windows.

### Where to look things up

You will use three areas of the runtime. Keep their documentation open in a browser tab:

1. **The net module**: creating TCP servers and TCP connections (called sockets).
2. **The fs module**: reading and writing files, especially reading and writing them as **streams**.
3. **The crypto module**: generating random IDs and computing **hashes** of data.

Bun implements these Node.js modules, so the Node.js documentation for them applies.

---

## How to Use This Guide

- Work through the stages **in order**. Every stage builds on the one before it.
- Each stage has the same shape:
  - **Goal**: what you will have at the end.
  - **Concepts**: the new ideas you need, explained.
  - **Steps**: what to build, in order.
  - **Checkpoint**: how to check that it works before moving on.
- Do not skip a checkpoint. Networking bugs are much easier to find when you know that everything below them already works.
- Commit your work to version control (for example Git) after each checkpoint passes. If you break something later, you can always go back.
- When a step says "decide", there is no single right answer. The guide gives a recommendation; you can follow it or choose your own path.

---

## Part 1: The Concepts You Need

Read this part once before you start building. Come back to it whenever a word in a later stage is unfamiliar. The [Glossary](#glossary) at the end has short definitions too.

### 1.1 IP addresses and ports

Every computer on a network has an **IP address**, such as 192.168.1.20. It works like a street address: it tells the network which computer to deliver data to.

One computer runs many programs at once, so an address alone is not enough. Each program that wants to receive network connections claims a **port**, a number between 1 and 65535. The address picks the computer; the port picks the program on it. Together they look like 192.168.1.20 port 4000.

Two special cases you will use a lot:

- **localhost** (address 127.0.0.1) always means "this same computer". Use it when you run several peers on one machine.
- **Port 0** means "operating system, please pick any free port for me". This is useful in automated tests.

Only one program can listen on a given port at a time. If you try to start a second one on the same port, you get an "address already in use" error.

### 1.2 TCP: a reliable pipe of bytes

To send data between two programs you will use **TCP** (Transmission Control Protocol). TCP gives you a **connection** between two programs, and that connection behaves like a pipe:

- **Reliable**: if a piece of data gets lost on the way, TCP sends it again automatically.
- **Ordered**: bytes come out of the pipe in exactly the order they were put in.
- **Two-way**: both ends can send and receive at the same time.

One end must be **listening** (waiting for connections on a port). The other end **connects** to that address and port. Once the connection is open, both ends are equal and can send whatever they like.

Each end of a connection is represented in your program by a **socket** object. You write data into your socket, and it comes out of the socket at the other end.

### 1.3 The most important fact in this guide: TCP is a stream, not a list of messages

TCP guarantees that the bytes arrive in order. It does **not** keep track of where one of your "messages" ends and the next one begins.

If you send "hello" and then "world", the other side might receive:

- "hello" and then "world" (what you hoped for), or
- "helloworld" all at once, or
- "hel", then "lowor", then "ld".

All three are correct behaviour for TCP. The network and the operating system are free to merge your writes together or split them apart. This is often called **message coalescing** (merging) and **fragmentation** (splitting).

This means your program needs its own rule for marking where each message starts and ends. That rule is called **framing**, and building it is the heart of Stages 3 to 6. Almost every beginner networking bug comes from forgetting this fact.

### 1.4 Bytes, buffers and text encoding

Networks and files deal only in **bytes**. A byte is a number from 0 to 255.

- In Bun and Node.js, a sequence of bytes is held in a **Buffer**. You can create a Buffer, read numbers out of it at a given position, copy part of it, and join several Buffers into one.
- Text is not bytes. To send text you must **encode** it into bytes, and the receiver must **decode** the bytes back into text. Always use the **UTF-8** encoding on both sides. It handles every language and every emoji.
- Watch out: in UTF-8 one character can take more than one byte. So the length of a string in characters is **not** always the same as its length in bytes. When you measure a message for the network, always measure the bytes.

### 1.5 JSON for structured messages

Your peers need to send structured information, such as "my ID is X and I speak version 1". The simplest way is **JSON**: you turn an object into a JSON string (this is called **serializing**), encode that string into UTF-8 bytes, and send them. The receiver decodes the bytes into a string and parses the JSON back into an object (**deserializing**).

JSON is easy to read and debug, which makes it a good choice for learning. Its weakness is that it cannot hold raw binary data directly. Stage 10 shows how to deal with that.

### 1.6 Big-endian numbers

You will need to write a number (the length of a message) into a few bytes. A number larger than 255 needs several bytes, and the question is which byte comes first.

- **Big-endian** puts the most significant byte first, the same way we write numbers on paper (the "thousands" digit before the "ones" digit).
- **Little-endian** puts the least significant byte first.

Network protocols traditionally use big-endian, which is why it is also called **network byte order**. It does not matter which one you choose, as long as the sender and the receiver choose the **same** one. This guide uses big-endian.

### 1.7 Events and asynchronous programming

Network and file operations take time. Your program cannot stop and wait for the next byte to arrive, because it also has to handle other peers, the keyboard and timers. So the runtime uses **events**: you register a function (a **handler** or **listener**) for a named event, and the runtime calls it when that event happens.

The socket events you will use:

| Event     | When it happens                                                     |
| --------- | ------------------------------------------------------------------- |
| "data"    | Some bytes arrived. You receive them as a Buffer.                   |
| "end"     | The other side has finished sending and is closing its half.        |
| "close"   | The connection is fully closed, for any reason.                     |
| "error"   | Something went wrong, such as the other side vanishing.             |
| "drain"   | The socket's outgoing queue has emptied and it is ready for more.   |

A very important rule: **always listen for the "error" event** on every socket and every server. In Node.js and Bun, an error event that nobody listens to crashes the entire program.

### 1.8 Streams

A **stream** is a way to process data piece by piece instead of all at once. A TCP socket is a stream. Files can also be read and written as streams.

This matters for file sharing: a 4 GB video does not fit comfortably in memory. Instead of loading the whole file, you read it in small pieces, send each piece, and forget it. The receiver writes each piece to disk as it arrives. Your program's memory use stays small no matter how big the file is.

### 1.9 Hashes

A **hash function** (you will use **SHA-256**) takes any amount of data and produces a short, fixed-size fingerprint, usually shown as 64 hexadecimal characters. Two useful properties:

- The same data always gives the same hash.
- Changing even one bit of the data gives a completely different hash.

So if the sender tells the receiver "the hash of this file is X", the receiver can hash what it received and compare. If they match, the file arrived perfectly. Hashes can also be computed **incrementally**: you feed the data in piece by piece and ask for the final fingerprint at the end, which works well with streams.

### 1.10 Discriminated unions in TypeScript

Your peers will exchange many kinds of messages. In TypeScript you can describe them as a **discriminated union**: a type that is "one of these shapes", where every shape has a field (here, called **type**) with a different fixed text value, such as "HELLO" or "PING".

When your code checks the type field, TypeScript automatically knows which other fields exist on that message. This catches many mistakes at compile time, such as reading a field that a message type does not have. You will use this pattern for every message in your protocol.

---

## Stage 1: Set Up Your Project

### Goal

An empty, well-organized TypeScript project that runs with Bun.

### Steps

1. **Create a project folder** with a name such as p2p-fileshare and open it in your terminal.
2. **Initialize the project** using Bun's init command. Choose a blank project. This creates a package file, a TypeScript configuration file and a starting file.
3. **Turn on strict type checking** in the TypeScript configuration file, if it is not already on. Strict mode catches mistakes like forgetting that a value can be missing.
4. **Create a source folder** called src. You will put all your TypeScript files in it.
5. **Plan your files.** You will not create all of them now, but it helps to know where things will go:

   | File (in src)            | Responsibility                                                  |
   | ------------------------ | --------------------------------------------------------------- |
   | protocol                 | Message types, the encoder and the decoder. No networking here. |
   | connection               | Wraps one socket: sends and receives whole messages.            |
   | peer                     | Listens, connects, keeps track of all connected peers.          |
   | shared-files             | Scans the shared folder and serves file pieces.                 |
   | downloads                | Receives file pieces and writes them to disk.                   |
   | cli                      | Reads your typed commands and prints results.                   |
   | main                     | Reads startup options and wires everything together.            |

   Keeping protocol logic separate from networking is the single most useful design decision in this project. It lets you test the protocol without opening a single connection.

6. **Add scripts** to the package file so you can start each program with a short name, using Bun's run command. Add one for every program you create in the stages ahead.
7. **Create two folders for testing** later: one called shared (put a few small text files and one large file inside, for example a video or a disk image of a few hundred megabytes) and one called downloads (leave it empty). Add the downloads folder to your version control ignore file.

### Checkpoint

Create a tiny file in src that prints a message, run it with Bun, and see the message in your terminal. Then delete it.

---

## Stage 2: Your First Network Connection

### Goal

Two small programs, a server and a client, that connect over TCP and send text to each other. You will also **see** the stream problem from section 1.3 with your own eyes.

### Concepts

- The server **listens** on a port and gets a new socket every time someone connects.
- The client **connects** to an address and port and gets one socket.
- Both sides use the same events from section 1.7.

### Steps

1. **Write the server.** Using the net module, create a server. Give it a function that runs for every new connection. In that function:
   - Print "connection established".
   - Write a greeting such as "Thanks for contacting this server" into the socket.
   - Listen for "data" and print what arrived.
   - Listen for "end" and print "connection ended".
   - Listen for "error" and print the error.
2. **Start listening** on a fixed port, such as 3002, on localhost. Print a message when listening starts. Also listen for the server's own "error" event, so that "address already in use" is reported clearly instead of crashing.
3. **Write the client.** Using the net module, connect to localhost on the same port. When the connection opens, print "connected". Listen for "data", "end" and "error" just like the server does. When data arrives, print it and write a reply such as "hello there".
4. **Run them.** Start the server in one terminal and the client in a second terminal. You should see both sides print each other's messages.
5. **Break it on purpose.** Change the client so that, right after connecting, it writes three short messages one after another, as fast as possible, with no waiting in between. Run it again and look at what the server prints. Very often you will see all three messages printed as **one** single piece of text.

### Checkpoint

- The client and server exchange text.
- Stopping the client with Ctrl+C makes the server print that the connection ended (or an error), without the server crashing.
- You have seen several writes arrive glued together. This is exactly the problem the next stage solves.

---

## Stage 3: Design Your Protocol

### Goal

A clear written design for how your peers will talk: how messages are framed and which message types exist. Write this design down in a notes file before you write any code for it.

### Concepts

A **protocol** is a set of rules that both sides agree on, the same way two people agree to speak the same language. Yours has two layers:

1. **Framing**: how to cut the incoming stream of bytes into separate messages.
2. **Messages**: what each message means and which fields it carries.

### Step 1: Choose a framing method

There are three common ways to mark message boundaries:

| Method              | How it works                                                          | Downside                                                       |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Delimiter           | End each message with a special character, such as a newline.         | That character must never appear inside a message.             |
| Fixed size          | Every message is exactly N bytes.                                     | Wastes space on small messages; cannot hold big ones.          |
| **Length prefix**   | Put the message's length in front of it.                              | Slightly more work to implement. This is the one to use.       |

With a **length prefix**, the receiver first reads the length, then knows exactly how many bytes to wait for. It works for any content and any size. Most real protocols use it.

### Step 2: Define the frame layout

Each message travels as one **frame**:

| Position in the frame | Size              | Contents                                                             |
| --------------------- | ----------------- | -------------------------------------------------------------------- |
| Bytes 0 to 3          | 4 bytes           | The payload length N, as an unsigned 32-bit big-endian integer.      |
| Bytes 4 to 4 + N - 1  | N bytes           | The **payload**: the message as JSON text, encoded in UTF-8.         |

The 4-byte part is called the **header**. "Unsigned 32-bit" means it can hold any whole number from 0 to about 4.29 billion.

Example: the message "PING" serialized to JSON is 15 bytes long. Its frame is 19 bytes: a 4-byte header holding the number 15, then the 15 bytes of JSON.

### Step 3: Set a maximum payload size

Decide on a **maximum payload size**. The recommendation is **1 MiB** (1,048,576 bytes).

Why have a limit at all? Your receiver trusts the length in the header to decide how much data to collect in memory. A buggy or malicious peer could send a header claiming 4 billion bytes, and your program would try to hold all of that. With a limit, the receiver can reject such a frame immediately.

Note that this is the limit for **one message**, not for files. Files will be split into many smaller messages in Stage 10, so they can be any size.

Also decide that a payload length of **zero** is invalid, since an empty payload cannot be valid JSON.

### Step 4: Define the first message types

Start with only three message types. You will add file-related ones in Stage 10.

| Type      | Fields                                                     | Meaning                                                                  |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| **HELLO** | peerId (text), version (the number 1)                      | "This is who I am and which protocol version I speak." Sent first.       |
| **PING**  | none besides type                                          | "Are you still there?"                                                   |
| **PONG**  | none besides type                                          | "Yes, I am still here." Sent in reply to a PING.                         |

Every message, of every kind, has a type field that tells the receiver what kind of message it is.

### Step 5: Write it as a TypeScript type

In your protocol file, describe these three messages as a discriminated union (section 1.10) named Message. Also define a constant for the maximum payload size. Do not write any functions yet.

### Checkpoint

You have a notes file describing the frame layout and message table, and a protocol file containing the Message type and the size constant. Both should be consistent with each other.

---

## Stage 4: Build the Message Encoder

### Goal

A function that turns one Message object into one frame (a single Buffer) ready to be written to a socket.

### Steps

Write a function, for example called encodeMessage, that accepts a Message and returns a Buffer:

1. Serialize the message to a JSON string.
2. Encode the JSON string into a UTF-8 Buffer. This is the **payload**.
3. Measure the payload's length **in bytes** (not the string's length in characters; see section 1.4).
4. Optionally, check the length against your maximum payload size and throw an error if it is too large. Catching this on the sending side makes bugs easier to find.
5. Allocate a new 4-byte Buffer. This is the **header**.
6. Write the payload length into the header as an unsigned 32-bit big-endian integer, starting at position 0.
7. Join the header and the payload into a single Buffer, header first, and return it.

### Checkpoint

Encode a PING message and print the resulting Buffer. The first four bytes should be 00 00 00 0f (15 in hexadecimal), followed by the bytes of the JSON text. Encode a HELLO message and check that the header matches the payload's byte length.

---

## Stage 5: Build the Message Decoder

### Goal

An object that you feed raw chunks of bytes from a socket, in whatever sizes they happen to arrive, and that gives you back a list of complete, validated messages.

This is the most important component in the whole project. Take your time with it.

### Concepts

Because of section 1.3, a single "data" event might contain:

- Less than one header.
- A header and part of a payload.
- Exactly one frame.
- Several complete frames.
- Several complete frames **and** the start of another one.

The decoder must handle every one of these cases. The trick is to keep an **internal buffer** of bytes that have arrived but not yet been turned into messages.

The decoder has to remember things between calls (the leftover bytes), so make it a **class** rather than a plain function. Create a new decoder for every connection, because every connection has its own stream of bytes.

### Steps

Create a class, for example called MessageDecoder, with:

- A private field holding the internal buffer, starting empty.
- One public method, for example called push, that accepts a chunk (a Buffer) and returns a list of messages (possibly empty).

Inside push:

1. **Append** the new chunk to the end of the internal buffer.
2. Create an empty list for the messages you are about to find.
3. **Loop** for as long as the internal buffer holds at least 4 bytes (enough for a header):
   1. **Read the header**: read an unsigned 32-bit big-endian integer from position 0. This is the payload length.
   2. **Reject bad lengths**: if it is larger than the maximum payload size, throw an error ("payload too large"). If it is zero, throw an error ("empty payload").
   3. **Compute the frame length**: 4 plus the payload length.
   4. **Wait if incomplete**: if the internal buffer holds fewer bytes than the frame length, the rest of this frame has not arrived yet. **Stop the loop** (do not throw; this is normal).
   5. **Cut out the payload**: take the bytes from position 4 up to the frame length.
   6. **Keep the rest**: replace the internal buffer with everything after the frame length. These bytes belong to the next frame(s).
   7. **Parse and validate** the payload (see below) and add the resulting message to the list.
4. After the loop, **return the list**.

Make sure you remove the frame from the internal buffer **before** you parse it. That way the internal buffer is always in a consistent state.

### Validation: never trust the network

The payload came from another program, which might be buggy, outdated or malicious. Do not just parse the JSON and assume it has the right shape. Write a separate helper function, for example called parseMessage, that:

1. Decodes the payload bytes into a UTF-8 string.
2. Parses the JSON. If parsing fails, throws an error ("invalid JSON").
3. Checks that the result is an object (not null, not a number, not an array) and has a type field. If not, throws an error ("malformed message").
4. Looks at the type field and, for each known type, checks that every required field exists and has the correct kind of value. For HELLO: peerId must be text, and version must be exactly 1.
5. Builds and returns a **fresh** message object containing only the expected fields. This throws away any extra unexpected fields.
6. For any type it does not recognize, throws an error ("unknown message type").

### Decide your error policy

When push throws, what should the caller do? The recommendation: treat any decoder error as a **protocol violation** and close that connection. Once the stream contains garbage, there is no reliable way to find where the next valid frame begins. Note that the bad bytes stay in the decoder's internal buffer, so calling push again on the same decoder will keep failing; this is fine because the connection is being closed anyway.

### Checkpoint

Encode a few messages, join their frames into one Buffer, push it into a new decoder, and check that you get all the messages back, in order. Stage 6 turns this into proper automated tests.

---

## Stage 6: Test Your Protocol

### Goal

Automated tests that prove your encoder and decoder work in every situation, so you can build on them with confidence.

### Concepts

Bun has a built-in test runner. Test files are named with ".test.ts" at the end, and Bun's test command finds and runs them. Each test performs some action and then **expects** the result to equal a known value.

Because your protocol file contains no networking (Stage 1, step 5), you can test it by feeding Buffers directly to the decoder. This is fast and completely predictable.

### Steps

Create a test file next to your protocol file and write one test for each of these cases:

| Test case                         | What to do                                                                    | What to expect                                     |
| --------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| Round trip                        | Encode each message type, decode it.                                          | The same message comes back.                       |
| Several frames in one chunk       | Join three encoded frames, push once.                                         | Three messages, in order.                          |
| One byte at a time                | Push an encoded frame one byte per call, collecting results.                  | Exactly one message in total, at the very end.     |
| Split across chunks               | Push two frames with the last 2 bytes held back, then push those 2 bytes.     | First call returns one message, second the other.  |
| Header split in half              | Push the first 2 bytes of a header, then the rest of the frame.               | Nothing, then the message.                         |
| Payload too large                 | Push a header claiming more than the maximum size.                            | An error.                                          |
| Empty payload                     | Push a header with length zero.                                               | An error.                                          |
| Invalid JSON                      | Build a frame by hand whose payload is not JSON.                              | An error.                                          |
| Not an object                     | Build a frame whose payload is a JSON array or number.                        | An error.                                          |
| Unknown type                      | Build a frame whose payload has a made-up type.                               | An error.                                          |
| Missing or wrong field            | A HELLO whose peerId is a number, or whose version is 2.                      | An error.                                          |
| Non-English text                  | A HELLO whose peerId contains emoji or accented letters.                      | The same message comes back.                       |

For the error cases you must build frames "by hand" (write your own header and payload) because your encoder only produces valid messages.

### Checkpoint

All tests pass when you run Bun's test command. From now on, run the tests after every change to the protocol file.

---

## Stage 7: Wrap Each Connection

### Goal

A **Connection** class that hides bytes, Buffers and framing from the rest of your program. Everything above it deals only in whole Message objects.

### Concepts

This is called an **abstraction layer**. The socket understands bytes; the rest of your program should only understand messages. The Connection class translates between the two.

### Steps

Create a Connection class that is built from one socket. It should:

1. **Create its own decoder** when it is constructed.
2. **Offer a send method** that takes a Message, encodes it into a frame and writes the frame to the socket.
3. **Listen for "data"** on the socket. For every chunk, push it into the decoder. For each message that comes back, hand it to a message handler (see step 6).
4. **Catch decoder errors.** If push throws, log the reason and destroy the socket. One misbehaving peer must never crash your program.
5. **Listen for "error" and "close".** On "error", log it. On "close", mark the connection as closed, stop any timers it owns, and tell the rest of the program (see step 6).
6. **Let the outside world subscribe.** Provide a way for other code to register a function to call when a message arrives and a function to call when the connection closes. The simplest approach is to accept these functions as options or store them as properties. A more flexible approach is to make Connection an **event emitter** that emits its own "message" and "close" events.
7. **Remember who is on the other end**: the remote address and port (available on the socket), and later the remote peer's ID.
8. **Provide a close method** that ends the socket politely.

Then change your Stage 2 server and client to use Connection and send PING and PONG messages instead of plain text: the client sends PING, the server replies with PONG.

### Checkpoint

- Run the server and client again. The PING and PONG messages arrive as proper objects.
- Re-run the "break it on purpose" experiment from Stage 2: send many PINGs instantly. Every single one now arrives separately and gets its own PONG. You have solved the stream problem.

---

## Stage 8: The Handshake and the Heartbeat

### Goal

Every connection starts by both sides introducing themselves, and dead connections are detected automatically.

### Concepts

- A **handshake** is the first exchange on a new connection. It lets both sides check that they are compatible and learn who they are talking to, before doing anything else.
- A **peer ID** is a unique name for each running peer. Generate a random **UUID** (a 36-character random identifier) with the crypto module when your program starts. It will be different every time the program runs, which is fine for now.
- A **heartbeat** is a small message sent regularly to prove a connection is still alive. TCP alone can take a very long time to notice that the other computer has lost power or Wi-Fi.
- A **state machine** is a way of saying "a connection is in exactly one state at a time, and only some messages are allowed in each state".

### Steps

**The handshake:**

1. Give each Connection a **state**, starting as "handshaking".
2. As soon as a connection opens (on both the listening side and the connecting side), **send a HELLO** containing your peer ID and protocol version.
3. While in "handshaking", the **only** message allowed from the other side is HELLO. If anything else arrives first, close the connection.
4. When a HELLO arrives:
   - If its version is not one you support, close the connection. (Your validator already rejects versions other than 1; later, when you have several versions, this is where you would choose.)
   - If its peerId equals **your own** peer ID, you have connected to yourself (this happens more easily than you think). Close the connection.
   - Otherwise, store the remote peer ID on the Connection, change the state to "ready", and announce that the connection is ready.
5. If a HELLO arrives when the state is already "ready", treat it as a protocol violation and close.
6. **Handshake timeout**: when the connection opens, start a timer of about 10 seconds. If the state is still "handshaking" when it fires, close the connection. Cancel the timer once the handshake finishes.

**The heartbeat:**

7. When a connection becomes "ready", start a repeating timer that sends a PING every 15 seconds.
8. Whenever **any** message arrives, record the current time as "last heard from".
9. When a PING arrives, reply with a PONG.
10. In the same repeating timer, check the "last heard from" time. If more than 45 seconds have passed (three missed heartbeats), assume the peer is gone and close the connection.
11. When a connection closes, **stop all of its timers**. Timers that keep running after a connection closes are a classic source of crashes and memory leaks.

### Checkpoint

- Start the server and client. Both print the other side's peer ID once the handshake completes.
- Leave them running for a minute. You see a PING and PONG every 15 seconds.
- Temporarily make the client skip its HELLO. The server closes the connection after 10 seconds.
- Temporarily make the client never answer PINGs and never send anything. The server closes the connection after about 45 seconds.

---

## Stage 9: Turn Your Program into a Real Peer

### Goal

One program that both listens and connects. You will no longer need separate server and client programs.

### Concepts

- In P2P there is no "server program" and "client program", only peers. A peer listens for incoming connections **and** can open outgoing connections.
- Once the handshake is done, it should not matter who connected to whom. Both connections are handled by exactly the same code.
- A **peer registry** is a map from peer ID to Connection, so you can find any connected peer by its ID.

### Steps

1. **Create a Peer class.** It owns:
   - Its own peer ID.
   - A TCP server that listens on a port.
   - The peer registry.
2. **Read startup options.** When your program starts, read the command-line arguments to get the port to listen on, the path of the shared folder and the path of the downloads folder. Use sensible defaults when they are missing, and print a short usage message if something is invalid.
3. **Incoming connections**: for every new socket on the server, wrap it in a Connection.
4. **Outgoing connections**: provide a connect method that takes a host and a port, opens a socket with the net module and wraps it in a Connection. Report a clear error if the connection is refused (nobody is listening there).
5. **When a connection becomes ready**, add it to the registry under the remote peer's ID.
6. **Handle duplicates.** If a peer with the same ID is already in the registry (for example both sides connected to each other at the same moment), keep the existing connection and close the new one.
7. **When a connection closes**, remove it from the registry, but only if the registry entry is that same Connection object (a duplicate closing must not remove the original).
8. **Print events** as they happen: "peer X connected", "peer X disconnected".

### Checkpoint

- Start three copies of your program on localhost, on ports 4001, 4002 and 4003.
- Tell peer 4002 to connect to 4001, and peer 4003 to connect to both. (For now, you can pass "connect to" addresses as extra startup arguments. Stage 13 adds typed commands.)
- Each peer lists the correct connected peers, and stopping one makes the others print that it disconnected.

---

## Stage 10: Design File Transfer

### Goal

A written design, added to your notes file, for how files are listed, requested and transferred. As in Stage 3, design first and code second.

### Concept 1: Chunking

You cannot send a file as one message: it might be gigabytes, and your maximum payload size is 1 MiB. Instead, split it into **chunks** of a fixed size, and send each chunk as its own message.

- A good chunk size is **64 KiB** (65,536 bytes).
- The number of chunks is the file size divided by the chunk size, **rounded up**. The last chunk is usually smaller than the others.
- Chunks are numbered starting at 0. This number is the **chunk index**.
- An empty file (0 bytes) has 0 chunks. Make sure your design handles it.

### Concept 2: Binary data inside JSON

File contents are raw bytes, but your messages are JSON text, which cannot carry raw bytes. The simplest solution is **Base64**: an encoding that turns any bytes into plain letters, digits and a few symbols. The receiver decodes the Base64 back into the original bytes.

Base64 makes data about **33% larger**. A 64 KiB chunk becomes about 87 KiB of text, which is comfortably under your 1 MiB limit. The overhead is a fair price for simplicity while learning. [Going Further](#going-further) explains how to remove it later.

### Concept 3: Integrity checking

TCP protects against data lost in transit, but bugs in your own code (a chunk written twice, or in the wrong place) can still corrupt a file. So every file is identified by its **SHA-256 hash** (section 1.9), and the receiver verifies the hash after the transfer.

Using the hash as the file's **ID** has a bonus: two identical files have the same ID, no matter what they are called.

### Concept 4: Transfer IDs

A peer might download several files from the same peer at once. Every chunk message must say which download it belongs to. When the sender starts a transfer, it creates a random **transfer ID** and includes it in every message about that transfer.

### Step 1: Add the new message types

| Type                | Sent by    | Fields                                                                                         | Meaning                                                  |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **LIST_REQUEST**    | Downloader | none besides type                                                                              | "Which files are you sharing?"                           |
| **LIST_RESPONSE**   | Sharer     | files: a list where each item has fileId (the hash), name and size in bytes                    | "Here are my shared files."                              |
| **FILE_REQUEST**    | Downloader | fileId                                                                                         | "Please send me this file."                              |
| **FILE_META**       | Sharer     | transferId, fileId, name, size, chunkSize, totalChunks                                         | "A transfer is starting. Here is what to expect."        |
| **FILE_CHUNK**      | Sharer     | transferId, index, data (Base64 text)                                                          | "Here is chunk number index."                            |
| **FILE_COMPLETE**   | Sharer     | transferId                                                                                     | "I have sent every chunk."                               |
| **FILE_CANCEL**     | Either     | transferId, reason                                                                             | "Stop this transfer."                                    |
| **ERROR**           | Either     | code (a short fixed text such as FILE_NOT_FOUND), message (human-readable text)               | "Your request failed, and here is why."                  |

### Step 2: Write down the conversation

This is the full sequence for one download. Peer A wants a file from peer B:

1. A and B are already connected and past the handshake.
2. A sends **LIST_REQUEST**.
3. B replies with **LIST_RESPONSE**, listing its files.
4. The user on A picks a file. A sends **FILE_REQUEST** with that file's ID.
5. B looks the ID up. If it does not exist, B sends **ERROR** with code FILE_NOT_FOUND, and the conversation ends here.
6. Otherwise B creates a transfer ID and sends **FILE_META**.
7. B sends **FILE_CHUNK** for index 0, 1, 2, and so on, up to the last chunk.
8. B sends **FILE_COMPLETE**.
9. A checks that it received every byte and that the hash matches, then saves the file.

At any point, either side can send **FILE_CANCEL**, after which both sides forget the transfer.

### Step 3: Update the protocol

1. Add all new message types to the Message union.
2. Extend your validator for each one: check every field's kind (text, whole number, list), that numbers are not negative, that index is less than totalChunks, and that list items in LIST_RESPONSE have the right shape.
3. Add tests for the new types: one valid round trip and at least one invalid example each.

### Checkpoint

All protocol tests pass, including the new ones. Your notes file contains the message table and the conversation above.

---

## Stage 11: The Sharing Side

### Goal

Your peer can describe the files in its shared folder and send any of them, chunk by chunk, to a peer that asks.

### Concepts

- **Path traversal** is a classic security hole. If a peer could ask for a file by its path, it might ask for something like "two folders up, then into the system's password file". Never accept file paths from the network. Peers ask by **file ID** only, and you look the ID up in a list you built yourself.
- **Backpressure**: your disk can usually read faster than your network can send. If you push chunks into the socket faster than they leave, they pile up in memory. The socket's write method tells you when this is happening: it returns **false** when its outgoing queue is full. When that happens, stop reading the file and wait for the socket's **"drain"** event before continuing. Ignoring backpressure is the most common reason file transfer programs use huge amounts of memory.

### Steps

**Build the file index:**

1. When the peer starts, list the entries of the shared folder.
2. Skip anything that is not a regular file, such as subfolders. Also skip hidden files whose names start with a dot.
3. For each file, record its name, its size in bytes and its full path on disk.
4. Compute each file's SHA-256 hash by **reading the file as a stream** and feeding every piece into an incremental hash. Do not read the whole file into memory at once.
5. Store everything in a map from file ID (the hash) to file record.
6. Print how many files are shared once indexing is done. Large files take a few seconds to hash; this is normal.

**Answer requests:**

7. When a **LIST_REQUEST** arrives, reply with a **LIST_RESPONSE** containing the ID, name and size of each file (never the full path on disk).
8. When a **FILE_REQUEST** arrives, look up the file ID. If it is not found, send an **ERROR** with code FILE_NOT_FOUND.
9. Otherwise, create a transfer ID, compute the total number of chunks and send **FILE_META**.
10. Open a **read stream** on the file, configured to deliver pieces exactly the size of your chunk size.
11. For each piece, in order: encode it as Base64, send it in a **FILE_CHUNK** with the next index, and add one to the index.
12. **Respect backpressure**: if the socket's write returns false, pause the read stream and resume it when the socket emits "drain".
13. When the read stream ends, send **FILE_COMPLETE**.
14. **Clean up**: keep track of active outgoing transfers by transfer ID. If the connection closes, or a FILE_CANCEL arrives, destroy the read stream and forget the transfer. If reading the file fails (for example, it was deleted), send FILE_CANCEL with a reason.

### Checkpoint

Connect two peers and send a FILE_REQUEST by hand (temporarily hard-code it in the downloading peer after the handshake). Print every message type the downloader receives. You should see one FILE_META, many FILE_CHUNK messages, and one FILE_COMPLETE. Try it with your large test file and watch the sending program's memory use in your operating system's activity monitor: it should stay roughly flat.

---

## Stage 12: The Receiving Side

### Goal

Your peer can download a file, write it safely to disk, verify it and show progress.

### Concepts

- **Partial files**: never write directly to the final file name. Write to a temporary name (for example the final name plus ".part") and **rename** it only after verification succeeds. A file with its real name is then always complete and correct, and a crash leaves only an obvious leftover.
- **File name sanitization**: the name in FILE_META comes from another peer. It could contain folder separators or ".." to escape your downloads folder. Keep only the base name (the part after the last folder separator), reject names that are empty, are "." or "..", or contain unusual control characters.
- **Expected state**: TCP is ordered, so chunks must arrive with indexes 0, 1, 2 and so on. Any other index means something is wrong.

### Steps

**Requesting:**

1. Provide a way to request a file from a connected peer by file ID. It sends FILE_REQUEST and remembers that a request is waiting for that file ID.

**On FILE_META:**

2. Check that you actually requested this file ID. If not, send FILE_CANCEL and ignore it.
3. Check that the numbers are consistent: totalChunks must equal size divided by chunkSize, rounded up. Optionally, reject files above a size you choose.
4. Sanitize the file name. If a file with that name already exists in the downloads folder, pick a new name, for example by adding a number in parentheses.
5. Open a **write stream** to the temporary ".part" file.
6. Create a **transfer record** containing: the transfer ID, the file ID (the expected hash), the final and temporary paths, the expected size, the total number of chunks, the next expected index (starting at 0), the bytes received so far, an incremental SHA-256 hash, and the write stream.
7. Store it in a map from transfer ID to transfer record.

**On FILE_CHUNK:**

8. Look up the transfer. If it does not exist, ignore the chunk or reply with FILE_CANCEL.
9. Check that the index equals the next expected index. If not, cancel the transfer.
10. Decode the Base64 data back into bytes. Check that the length is right: equal to the chunk size for every chunk except the last, which carries whatever remains.
11. Write the bytes to the write stream, feed them into the incremental hash, add their length to the bytes received and add one to the next expected index.
12. Show progress: the percentage is bytes received divided by expected size. To avoid flooding the terminal, print only when the whole-number percentage changes.

**On FILE_COMPLETE:**

13. Check that the next expected index equals totalChunks and that the bytes received equal the expected size.
14. Close the write stream and **wait until it has finished** flushing everything to disk.
15. Finish the incremental hash and compare it to the file ID.
16. If everything matches, rename the ".part" file to its final name and print "download complete" with the final path.
17. If anything does not match, delete the ".part" file and print a clear error saying what went wrong.
18. Remove the transfer record in both cases.

**On problems:**

19. On FILE_CANCEL or ERROR for a transfer, and when the connection closes in the middle of a transfer, close the write stream, delete the ".part" file and remove the transfer record. Print why.

### Checkpoint

- Download a small text file and open it. The contents match the original.
- Download your large test file. Use your operating system's built-in tool to compute the SHA-256 hash of both the original and the downloaded copy (for example shasum on macOS and Linux, or certutil on Windows). The two hashes are identical.
- Stop the sending peer in the middle of a large download. The receiver deletes the ".part" file and reports the failure.
- Download the same file twice. The second copy gets a different name instead of overwriting the first.

---

## Stage 13: A Command-Line Interface

### Goal

Control your running peer by typing commands, instead of editing code or restarting it.

### Concepts

- Your program can read what you type from **standard input** one line at a time. The runtime provides a readline facility for this, which emits an event each time you press Enter.
- A **command parser** splits each line into words: the first word is the command and the rest are its arguments.
- **Graceful shutdown** means closing everything properly when the program exits: stop accepting connections, end every connection, close every file, delete unfinished ".part" files.

### Steps

1. Set up line-by-line reading from standard input and show a prompt such as "p2p>".
2. Implement these commands:

   | Command                       | What it does                                                                          |
   | ----------------------------- | ------------------------------------------------------------------------------------- |
   | help                          | Lists all commands with a one-line description.                                       |
   | id                            | Prints your own peer ID and listening port.                                           |
   | connect host port             | Connects to another peer.                                                             |
   | peers                         | Lists connected peers: a number, the peer ID and the remote address.                  |
   | shared                        | Lists your own shared files.                                                          |
   | list peer                     | Sends LIST_REQUEST to a peer and prints the response as a numbered table.             |
   | get peer file                 | Downloads a file. "file" can be a number from the last list output, or a file ID.     |
   | transfers                     | Lists active uploads and downloads with their progress.                               |
   | cancel transfer               | Cancels a transfer.                                                                   |
   | quit                          | Shuts down gracefully.                                                                |

3. Let "peer" be either the number shown by the peers command or the beginning of a peer ID, since full UUIDs are tedious to type. If the beginning matches more than one peer, say so instead of guessing.
4. For an unknown command or wrong arguments, print a helpful message and the usage of that command. Never crash on user input.
5. Because LIST_RESPONSE arrives later, asynchronously, the list command needs to remember that it is waiting for an answer from that peer, then print the table when the answer arrives. Add a timeout of a few seconds that prints "no response" if nothing comes back.
6. Implement graceful shutdown for both the quit command and Ctrl+C. Ctrl+C sends your program a signal called SIGINT, which you can listen for.

### Checkpoint

Start two peers in two terminals. Using only typed commands: connect them, list the other peer's files, download one, watch its progress with the transfers command, then quit both peers. Nothing crashes and no ".part" files are left behind.

---

## Stage 14: Make It Robust

### Goal

A peer that keeps running no matter what other peers or the network do.

### Steps

Work through this list and check each item in your code.

**Never trust another peer:**

1. Every incoming message is validated (Stage 5). Unknown types and malformed fields close the connection.
2. Messages that are valid but not allowed in the current state (for example FILE_CHUNK for a transfer you never started, or anything before HELLO) are rejected.
3. File names from other peers are sanitized (Stage 12) and file paths are never accepted (Stage 11).
4. Every number that controls memory or disk use has an upper limit: maximum payload size, maximum file size you are willing to download, maximum number of simultaneous transfers per peer, maximum number of connected peers.

**Never crash because of one peer:**

5. Every message handler is wrapped so that an unexpected error is caught, logged, and closes only that connection.
6. Every socket, server, read stream and write stream has an "error" listener.

**Clean up everything:**

7. When a connection closes: its timers stop, its outgoing transfers stop reading files, and its incoming transfers delete their ".part" files.
8. Leftover ".part" files from a previous crash are deleted when the program starts.

**Clear messages:**

9. Every error printed for the user says what happened and, where possible, what to do about it.
10. Add a **verbose** startup option that prints every message sent and received (but not the contents of FILE_CHUNK data, which would flood the screen). It makes debugging much easier.

**Know your limits:**

11. There is **no encryption** in this system. Anyone on the same network who can see the traffic can read every file you transfer, and any peer can connect to you. Only use it on networks you trust, and only share files you are happy for anyone on that network to have. [Going Further](#going-further) explains how to add security.

### Checkpoint

Write a tiny "evil peer" for testing: a program that connects to your peer and sends a series of bad inputs, one connection each: random bytes, a huge length header, invalid JSON, an unknown message type, a FILE_CHUNK before HELLO, a FILE_META with the name "../../secret.txt". Your real peer must reject each one, close only that connection, and keep serving well-behaved peers normally.

---

## Stage 15: Test the Whole System

### Goal

Automated tests that run two real peers and transfer a real file, plus a manual test checklist.

### Steps

**Automated integration test:**

1. In a new test file, create two temporary folders for each of two peers (shared and downloads), using the operating system's temporary directory.
2. Write a test file of a few megabytes of random bytes into the first peer's shared folder.
3. Start both peers on **port 0** (section 1.1), then read the actual port each one got.
4. Connect the second peer to the first and wait for the handshake to finish.
5. Request the file list, then request the file, and wait for the download to finish. To make "waiting" possible in a test, have your Peer class report completion through a promise or an event.
6. Check that the downloaded file exists and its hash equals the original's.
7. Shut down both peers and delete the temporary folders, even if the test failed.

Add more integration tests the same way: an empty file, a file whose size is an exact multiple of the chunk size, a request for a file ID that does not exist, and a peer disconnecting during a transfer.

**Manual test checklist** (do this on two real computers if you can):

- Find your computer's local IP address in your operating system's network settings.
- Start a peer on each computer. If they cannot connect, check that your firewall allows incoming connections on your chosen port.
- Transfer a small file, a large file, a file with spaces and non-English letters in its name, and an empty file.
- Download from both directions.
- Unplug the network cable or turn off Wi-Fi on one computer during a transfer, and check that the other side notices within about 45 seconds (the heartbeat from Stage 8).

### Checkpoint

All automated tests pass and every item on the manual checklist works. **Congratulations: you have built a peer-to-peer file sharing system from scratch.**

---

## Going Further

Your system works, but it has limits. Each idea below is a self-contained project that teaches something new. They are listed roughly from easiest to hardest.

### Resume interrupted downloads

Keep the ".part" file when a transfer fails, together with a small record of how many chunks were received. Add an optional "start from chunk N" field to FILE_REQUEST, and have the sender skip ahead. Because you can no longer hash the whole file incrementally from the beginning, re-hash the ".part" file before resuming.

### Binary frames instead of Base64

Remove the 33% overhead. Add one byte to the frame header that says whether the payload is JSON or raw binary. Send FILE_CHUNK as a small JSON header followed by the raw chunk bytes. This means changing the frame layout, so increase your protocol version number and handle the version check in the handshake properly.

### Per-chunk hashes

Instead of one hash for the whole file, hash every chunk and send the list of chunk hashes in FILE_META. The receiver can then detect a bad chunk immediately and ask for just that chunk again, instead of failing the whole download.

### Downloading from many peers at once (swarming)

This is the central idea behind BitTorrent. If several peers share the same file (same file ID), request different chunks from different peers at the same time and assemble them in the right order on disk. You need per-chunk hashes, a FILE_REQUEST that asks for a range of chunks, and writing to arbitrary positions in a file instead of appending.

### Finding peers automatically (discovery)

Right now you type addresses by hand. Options, from simple to advanced:

- **Peer exchange**: after the handshake, peers tell each other the addresses of the other peers they know.
- **A tracker**: a small, well-known server that peers register with and ask for a list of other peers. This reintroduces a central component, but only for introductions; files still travel directly between peers.
- **Local network discovery**: peers announce themselves on the local network using UDP broadcast or multicast DNS (mDNS), so others on the same Wi-Fi find them without any typing.
- **A distributed hash table (DHT)**: the fully decentralized approach used by BitTorrent, based on an algorithm called Kademlia. Peers collectively store "who has which file" with no central server at all.

### Connecting across the internet (NAT traversal)

At home, your computer is usually behind a router that uses **NAT** (Network Address Translation). Computers outside your home cannot connect to it directly. Ways around this, from simple to complex:

- **Port forwarding**: configure your router to send incoming connections on your port to your computer.
- **Hole punching**: two peers, introduced by a helper server (often using a protocol called STUN), connect to each other at the same time, which tricks many routers into allowing the connection.
- **Relays**: when nothing else works, both peers connect to a public relay server that passes data between them (the TURN protocol does this).

### Security

- **Encryption**: wrap your connections in TLS (the tls module works like the net module but encrypts everything), or implement a modern handshake pattern such as the Noise Protocol Framework.
- **Identity**: replace the random peer ID with a public key that stays the same each time the program runs. Peers prove who they are by signing the handshake with the matching private key. Users can then decide which peers they trust.

### A graphical interface

Use Bun's built-in web server to serve a small web page on localhost that shows peers, shared files and transfer progress, with buttons instead of typed commands. Push live updates to the page over a WebSocket.

---

## Troubleshooting

| Symptom                                                   | Likely cause and fix                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Address already in use" when starting a peer             | Another program, often an old copy of your peer, is still listening on that port. Stop it, or choose another port.                                                          |
| "Connection refused" when connecting                      | Nothing is listening at that address and port. Check the port number and that the other peer is running. For another computer, use its local IP address, not localhost.     |
| Connecting to another computer hangs, then times out      | A firewall is blocking the port, or the computers are on different networks. Allow the port in the firewall and check both are on the same network.                         |
| Two messages arrive as one, or one arrives in pieces      | You are reading raw "data" events instead of using the decoder. Every byte from a socket must go through the decoder (section 1.3, Stage 5).                               |
| The decoder rejects messages that look correct            | The sender and receiver disagree on the frame layout. Check both use 4 header bytes, unsigned 32-bit, big-endian, and that the length counts bytes, not characters.          |
| Messages with emoji or accented letters break the stream  | The length was measured on the string instead of the UTF-8 bytes (section 1.4).                                                                                             |
| The program crashes with an unhandled "error" event       | Some socket, server or stream has no "error" listener (section 1.7). Add one.                                                                                               |
| Memory grows quickly while sending a large file           | Backpressure is ignored. Pause reading when write returns false and resume on "drain" (Stage 11).                                                                           |
| Downloaded file fails the hash check                      | Chunks are written out of order, written twice, or the write stream was not fully flushed before hashing and renaming. Re-check Stage 12, steps 9 to 14.                     |
| Downloaded file is the right size but the last part is wrong | The last chunk's length handling is off by one. Check the "rounded up" chunk count and the last chunk's expected length.                                                 |
| The program does not exit after quit                      | Something is still running: a timer, a socket or the server. Make sure graceful shutdown closes all of them (Stage 13).                                                     |
| Connections close after exactly 45 seconds                | Heartbeat replies are not being sent, or "last heard from" is not updated on every message (Stage 8).                                                                       |

---

## Glossary

- **Backpressure**: a signal from a slower part of a system telling a faster part to wait.
- **Base64**: a way to represent any bytes using only letters, digits and a few symbols, so they can be placed inside text.
- **Big-endian**: storing a multi-byte number with its most significant byte first. Also called network byte order.
- **Buffer**: an object holding a sequence of bytes.
- **Chunk**: one fixed-size piece of a file.
- **Client**: the side of a connection that initiated it.
- **Decoder**: the component that turns incoming bytes into messages.
- **Discriminated union**: a TypeScript type that is one of several shapes, told apart by a common field.
- **Encoder**: the component that turns a message into bytes.
- **Event**: a named occurrence (such as "data arrived") that your code can react to.
- **Frame**: one complete message on the wire: a header plus a payload.
- **Framing**: the rule for where each message begins and ends in a stream.
- **Handshake**: the first messages on a new connection, used to identify both sides and check compatibility.
- **Hash**: a short fingerprint of some data. Any change to the data changes the hash.
- **Header**: the fixed-size part at the start of a frame; here, the payload length.
- **Heartbeat**: a regular small message that proves a connection is still alive.
- **IP address**: the network address of a computer.
- **JSON**: a text format for structured data.
- **localhost**: the address that always means "this computer".
- **NAT**: a router feature that lets many devices share one public address, which also blocks direct incoming connections.
- **Payload**: the actual content of a frame, after the header.
- **Peer**: one participant in a peer-to-peer system; both a client and a server.
- **Peer ID**: a unique identifier for a running peer.
- **Port**: a number that identifies one program on a computer for network connections.
- **Protocol**: the agreed rules both sides follow when communicating.
- **Serialization**: turning an object into text or bytes so it can be sent or stored.
- **Server**: the side of a connection that was listening and accepted it.
- **SHA-256**: a widely used hash function that produces a 256-bit fingerprint.
- **Socket**: your program's end of a network connection.
- **State machine**: a model where something is in exactly one state at a time, and events move it between states.
- **Stream**: data processed piece by piece as it arrives, instead of all at once.
- **TCP**: a network protocol that provides a reliable, ordered, two-way stream of bytes.
- **Transfer ID**: a unique identifier for one file transfer.
- **UTF-8**: the standard way of encoding text as bytes.
- **UUID**: a randomly generated 128-bit identifier, written as 36 characters.
- **Validation**: checking that incoming data has the expected shape and values before using it.

---

## Milestone Checklist

Tick these off as you go:

- [ ] Stage 1: The project runs with Bun.
- [ ] Stage 2: A server and client exchange text, and you have seen messages merge.
- [ ] Stage 3: The protocol design is written down, and the Message type exists.
- [ ] Stage 4: The encoder produces correct frames.
- [ ] Stage 5: The decoder returns complete, validated messages from any chunking.
- [ ] Stage 6: All protocol tests pass.
- [ ] Stage 7: The Connection class sends and receives whole messages.
- [ ] Stage 8: Handshake, handshake timeout and heartbeat all work.
- [ ] Stage 9: One peer program both listens and connects; three peers can run together.
- [ ] Stage 10: File transfer messages are designed, validated and tested.
- [ ] Stage 11: A peer serves its shared files in chunks, respecting backpressure.
- [ ] Stage 12: A peer downloads, verifies and saves files safely.
- [ ] Stage 13: Everything can be controlled with typed commands, and shutdown is clean.
- [ ] Stage 14: The "evil peer" cannot crash your peer.
- [ ] Stage 15: The integration tests and the manual checklist pass.

---

## About This Repository

This repository is a work-in-progress implementation that follows this guide. You do not need to read it to follow the guide, but you can compare your own work against it.

Current progress: Stages 1 to 5 are done. The src folder contains a basic TCP server and client (Stage 2) and a protocol file with the HELLO, PING and PONG message types, the length-prefixed encoder and the validating decoder (Stages 3 to 5).

To try it, install Bun, install the dependencies with Bun's install command, and then use Bun's run command with one of the script names defined in the package file: server, client or protocol. Start the server before the client, in separate terminals.
