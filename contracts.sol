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

    function buyProduce(uint256 _id) public payable {
        ProduceItem storage item = produceItems[_id];
        require(item.id != 0, "Produce item does not exist.");
        
        //Check for sufficient payment
        require(msg.value >= item.priceinRupees, "Insufficient payment sent.");

        //Prevent buying an already sold item
        require(
            keccak256(abi.encodePacked(item.currentStatus)) != keccak256(abi.encodePacked("Sold")),"Produce is already sold.");
        
        address payable seller = payable(item.currentSeller);
        uint256 price = item.priceinRupees;
        
        //Transfer the funds to the seller
        (bool success, ) = seller.call{value: price}("");  // Note: The use of call is the recommended way to send Ether
        require(success, "Ether transfer failed.");

        //Update the item state to reflect the sale
        item.currentStatus = "Sold";
        // The buyer is now technically the owner of the physical goods, 
        // but for simplicity in this contract, we keep 'currentSeller' as the last one paid. 
        // In a complex system, this would be updated to the buyer or nullified.

        //Record the Sale Transaction History (Payment History)
        produceSaleHistory[_id].push(
            SaleRecord(
                _id,
                msg.sender, // Buyer
                item.currentSeller, // Seller
                price, // Price paid
                block.timestamp
            )
        );

        emit ProduceSold(_id, msg.sender, item.currentSeller, price);
        
        //Refund any overpayment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed.");
        }
    }

    
    function getProduceDetails(
        uint256 _id
    ) public view returns (
        uint256 id,
        string memory name,
        address originalFarmer,
        address currentSeller,
        string memory currentStatus,
        uint256 priceInWei,
        string memory originFarm,
        string memory qrCode // The data customers scan
    ) {
        require(produceItems[_id].id != 0, "Produce item does not exist");
        ProduceItem storage item = produceItems[_id];
        return (
            item.id,
            item.name,
            item.originalFarmer,
            item.currentSeller,
            item.currentStatus,
            item.priceinRupees,
            item.originFarm,
            item.QRCode
        );
    }
    
    function getSaleHistory(uint256 _id) public view returns (SaleRecord[] memory) {
        require(produceItems[_id].id != 0, "Produce item does not exist");
        return produceSaleHistory[_id];
    }
}
