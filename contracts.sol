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
        uint256 priceInWei; // PRICE IS NOW EXPLICITLY IN WEI
        string originFarm;
        string QRCode;
        string quantity; // Added quantity field
    }

    // structure to log a financial transaction
    struct SaleRecord{
        uint256 ProduceId;
        address buyer;
        address seller;
        uint256 pricePaidInWei; // Renamed for clarity
        uint256 SaleTimeStamp;
    }

    // Mapping for product search by name
    mapping (string => uint256[]) public produceNameIndex;
    
    // mapping 
    mapping (uint256 => ProduceItem) public produceItems;
    mapping (uint256 => SaleRecord[]) public produceSaleHistory;

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
        uint256 newPriceInWei, // Updated name
        address indexed updater
    );

    event StatusUpdated(
        uint256 indexed id,
        string NewStatus,
        address indexed updater
    );

    event ProduceSold(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 pricePaidInWei // Updated name
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
        uint256 _initialPriceInWei, // PRICE INPUT IS NOW WEI
        string memory _QRCodeData,
        string memory _quantity // Added quantity parameter
    ) public returns(uint256){
        require(bytes(_name).length>0,"Name Cannot be Empty");
        require(bytes(_originFarm).length>0,"Origin Farm Cannot be Empty");
        // Price must be greater than zero, even in Wei
        require(_initialPriceInWei>0,"Price must be greater than zero"); 
        require(bytes(_QRCodeData).length>0,"QR Code Data Cannot be Empty");
        require(bytes(_quantity).length>0,"Quantity Cannot be Empty");
    

        uint256 CurrentId = nextProduceId;
        
        produceItems[CurrentId] = ProduceItem(
            CurrentId,
            _name,
            msg.sender,
            msg.sender,
            block.timestamp,
            "Harvested",
            _initialPriceInWei, // Stored as Wei
            _originFarm,
            _QRCodeData,
            _quantity // Store quantity
        );

        // Add the new item ID to the search index
        produceNameIndex[_name].push(CurrentId);

        nextProduceId++;
        emit ProduceRegistered(CurrentId, _name, msg.sender, _originFarm);
        return CurrentId;
    }

    function updateProducePrice(
        uint256 _id,
        uint256 _newPriceInWei
    ) public OnlyCurrentSeller(_id){
        require(_newPriceInWei>0,"Price must be greater than zero");

        produceItems[_id].priceInWei = _newPriceInWei;
        emit PriceUpdated(_id, _newPriceInWei, msg.sender);
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
        
        // Check for sufficient payment: compares sent Wei (msg.value) to stored Wei (item.priceInWei)
        require(msg.value >= item.priceInWei, "Insufficient payment sent.");

        // Prevent buying an already sold item
        require(
            keccak256(abi.encodePacked(item.currentStatus)) != keccak256(abi.encodePacked("Sold")),"Produce is already sold.");
        
        address payable seller = payable(item.currentSeller);
        uint256 price = item.priceInWei;
        
        // Transfer the funds to the seller
        (bool success, ) = seller.call{value: price}("");
        require(success, "Ether transfer failed.");

        // Update the item state to reflect the sale
        item.currentStatus = "Sold";

        // Record the Sale Transaction History (Payment History)
        produceSaleHistory[_id].push(
            SaleRecord(
                _id,
                msg.sender, // Buyer
                item.currentSeller, // Seller
                price, // Price paid in Wei
                block.timestamp // AUTOMATIC TIMESTAMP (SALE)
            )
        );

        emit ProduceSold(_id, msg.sender, item.currentSeller, price);
        
        // Refund any overpayment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed.");
        }
    }

    /**
     * @dev Retrieves a list of all unique IDs that share the given produce name.
     */
    function getProduceIdsByName(string memory _name) public view returns (uint256[] memory) {
        return produceNameIndex[_name];
    }
    
    function getProduceDetails(
        uint256 _id
    ) public view returns (
        uint256 id,
        string memory name,
        address originalFarmer,
        address currentSeller,
        string memory currentStatus,
        uint256 priceInWei, // Output explicitly named as Wei
        string memory originFarm,
        string memory qrCode,
        string memory quantity, // Added quantity to output
        uint256 registrationTimestamp
    ) {
        require(produceItems[_id].id != 0, "Produce item does not exist");
        ProduceItem storage item = produceItems[_id];
        return (
            item.id,
            item.name,
            item.originalFarmer,
            item.currentSeller,
            item.currentStatus,
            item.priceInWei, // Correctly returns the stored Wei value
            item.originFarm,
            item.QRCode,
            item.quantity, // Return quantity
            item.registrationTimeStamp
        );
    }
    
    function getSaleHistory(uint256 _id) public view returns (SaleRecord[] memory) {
        require(produceItems[_id].id != 0, "Produce item does not exist");
        return produceSaleHistory[_id];
    }
}