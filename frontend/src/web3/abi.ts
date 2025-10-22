export const PRODUCE_MARKET_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "farmer", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "originFarm", "type": "string" }
    ],
    "name": "ProduceRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "pricePaid", "type": "uint256" }
    ],
    "name": "ProduceSold",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "newPriceInRupees", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "updater", "type": "address" }
    ],
    "name": "PriceUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "NewStatus", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "updater", "type": "address" }
    ],
    "name": "StatusUpdated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_originFarm", "type": "string" },
      { "internalType": "uint256", "name": "_initialPriceinINR", "type": "uint256" },
      { "internalType": "string", "name": "_QRCodeData", "type": "string" }
    ],
    "name": "registerProduce",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "_id", "type": "uint256" } ],
    "name": "getProduceDetails",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "address", "name": "originalFarmer", "type": "address" },
      { "internalType": "address", "name": "currentSeller", "type": "address" },
      { "internalType": "string", "name": "currentStatus", "type": "string" },
      { "internalType": "uint256", "name": "priceInWei", "type": "uint256" },
      { "internalType": "string", "name": "originFarm", "type": "string" },
      { "internalType": "string", "name": "qrCode", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" }
    ],
    "name": "getSaleHistory",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "ProduceId", "type": "uint256" },
          { "internalType": "address", "name": "buyer", "type": "address" },
          { "internalType": "address", "name": "seller", "type": "address" },
          { "internalType": "uint256", "name": "pricePaid", "type": "uint256" },
          { "internalType": "uint256", "name": "SaleTimeStamp", "type": "uint256" }
        ],
        "internalType": "struct ProduceMarket.SaleRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "_id", "type": "uint256" }, { "internalType": "uint256", "name": "_newPriceInINR", "type": "uint256" } ],
    "name": "updateProducePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "_id", "type": "uint256" }, { "internalType": "string", "name": "_newStatus", "type": "string" } ],
    "name": "updateProduceStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "_id", "type": "uint256" } ],
    "name": "buyProduce",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextProduceId",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
