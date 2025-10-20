// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract ProduceMarket {
    // structure to hold details of produce items
    struct ProduceItem{
        uint256 id;
        string name;
        address originalFarmer;
        address currentSeller;
        uint256 registrationTimeStamp;
        string currentStatus;
        uint256 priceinRupees;
        string originFarm;
        string QRCode;
    }

    // structure to log a finanal transictions
    struct SaleRecord{
        uint256 ProduceId;
        address buyer;
        address seller;
        uint256 pricePaid;
        uint256 SaleTimeStamp;
    }

    // mapping 
    mapping (uint256 => ProduceItem) public produceItems;
    mapping (uint256 => SaleRecord[]) public produceSaleHistory; // stores all sales for a single produce

    uint256 public nextProduceId;
    // events
    event ProduceRegistered(
        uint256 indexed id,
        string name,
        address indexed farmer,
        string originFarm
    );

    event PriceUpdated(
        uint256 indexed id,
        uint256 newPriceInRupees,
        address indexed updater
    );

    event StatusUpdated(
        uint256 indexed id,
        string NewStatus,
        address indexed updater
    );

    // new event: Logs a successful direct purchase
    event ProduceSold(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 pricePaid
    );

    constructor() {
        nextProduceId = 1;
    }

    modifier OnlyCurrentSeller(uint256 _id){
        require(produceItems[_id].id != 0,"Item does not exist");
        require(msg.sender == produceItems[_id].currentSeller, "Only the current seller can call this function");
        _;
    }

    function registerProduce(
        string memory _name,
        string memory _originFarm,
        uint256 _initialPriceinINR,
        string memory _QRCodeData
    ) public returns(uint256){
        require(bytes(_name).length>0,"Name Cannot be Empty");
        require(bytes(_originFarm).length>0,"Origin Farm Cannot be Empty");
        require(_initialPriceinINR>0,"Price must be greater than zero");
        require(bytes(_QRCodeData).length>0,"QR Code Data Cannot be Empty");
    

    uint256 CurrentId = nextProduceId;
    produceItems[CurrentId] = ProduceItem(
        CurrentId,
        _name,
        msg.sender,   //Original Farmer is msg.sender
        msg.sender,   //Current seller is initially the original farmer
        block.timestamp,
        "Harvested",
        _initialPriceinINR,
        _originFarm,
        _QRCodeData
    );

    nextProduceId++;
    emit ProduceRegistered(CurrentId, _name, msg.sender, _originFarm);
    }

    function updateProducePrice(
        uint256 _id,
        uint256 _newPriceInINR
    ) public OnlyCurrentSeller(_id){
        require(_newPriceInINR>0,"Price must be greater than zero");

        produceItems[_id].priceinRupees = _newPriceInINR;
        emit PriceUpdated(_id, _newPriceInINR, msg.sender);
    }


    function updateProduceStatus(
        uint256 _id,
        string memory _newStatus
    ) public OnlyCurrentSeller(_id){
        require(bytes(_newStatus).length>0,"Status Cannot be Empty");

        produceItems[_id].currentStatus = _newStatus;
        emit StatusUpdated(_id, _newStatus, msg.sender);
    }
}
