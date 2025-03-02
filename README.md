# iq6900 Backend (Node.js)

## Key Features
- Retrieve `userPDA` value  
- Retrieve `userDBPDA` value  
- Initialize user  
- Retrieve transactions  
- Create transactions  
- Generate Merkle root  

## Getting Started  
This guide provides instructions for setting up and running the project.

```bash
$ git clone https://github.com/IQ6900/iq6900_backend
$ cd iq6900_backend
$ npm install

```

Start the application:
```bash
$ npm run build
$ npm run start
```

## Project Structure  
```bash
src
├─ app.ts: Run file
├─ presentation: Implements controller functions  
├─ provider: Core service logic  
└─ routes: API route definitions  
```