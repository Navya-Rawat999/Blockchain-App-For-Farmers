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
        uint256 currentStatus;
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
}