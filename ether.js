import { ethers } from 'ethers';

class ProduceMarketplace {
    constructor(contractAddress = null,) {
        
        this.contractAddress = '' // in evn file
        this.contractABI = [
            "function registerProduce(string _name, string _originFarm, uint256 _initialPriceInWei, string _QRCodeData) returns(uint256)",
            "function updateProducePrice(uint256 _id, uint256 _newPriceInWei)",
            "function updateProduceStatus(uint256 _id, string _newStatus)",
            "function buyProduce(uint256 _id) payable",
            "function getProduceDetails(uint256 _id) view returns (uint256, string, address, address, string, uint256, string, string, uint256)",
            "function getSaleHistory(uint256 _id) view returns (tuple(uint256, address, address, uint256, uint256)[])",
            "function getProduceIdsByName(string _name) view returns (uint256[])",
            "event ProduceRegistered(uint256 indexed id, string name, address indexed farmer, string originFarm)",
            "event PriceUpdated(uint256 indexed id, uint256 newPriceInWei, address indexed updater)",
            "event StatusUpdated(uint256 indexed id, string NewStatus, address indexed updater)",
            "event ProduceSold(uint256 indexed id, address indexed buyer, address indexed seller, uint256 pricePaidInWei)"
        ];
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;
        
        this.transactionHistory = this.loadTransactionHistory();
    }

    

    async initializeWithInfura() {
        
        const infuraUrl = '' // in env file
        

        try {
            // Connected with Infura
            this.provider = new ethers.JsonRpcProvider(infuraUrl);

            //This enables us to call functions from the smart contract (read only)
            this.contract = new ethers.Contract(
                this.contractAddress, 
                this.contractABI, 
                this.provider
            );

            console.log("Connected to blockchain via Infura ");
            return true;
        } catch (error) {
            console.error("Infura initialization failed:", error);
            throw error;
        }
    }

    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                //Request metamask for connection ... Opens metamask popup for user
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                //We are now using the user's wallet
                this.provider = new ethers.BrowserProvider(window.ethereum);


                //Access to users wallet
                this.signer = await this.provider.getSigner();
                //Acces to users public address
                this.userAddress = await this.signer.getAddress();
                
                //Now we can use write functions as well
                this.contract = this.contract.connect(this.signer);
                
                console.log("Wallet connected", this.userAddress);
                return this.userAddress;
            } catch (error) {
                console.error("Wallet connection failed", error);
                throw error;
            }
        } else {
            throw new Error("No wallet found");
        }
    }

    

    async registerProduce(name, originFarm, priceInRupees, qrCodeData) {
    
    //checking for connection with wallet 
        if (!this.signer) {
        throw new Error("Please connect your wallet first");
    }
    //record the regsitration of produce
    const txId = this.recordTransaction('registration', 'new', {
        name,
        originFarm, 
        priceInRupees,
        qrCodeData
    });
    // calling the smart contract function to register produce 
    try {
        const transaction = await this.contract.registerProduce(
            name,
            originFarm,
            priceInRupees,
            qrCodeData
        );

        //update the record 
        this.updateTransactionStatus(txId, 'processing', transaction.hash);
        
        // waiting 
        const receipt = await transaction.wait();
        
        //getting the produce id
        const event = receipt.logs.find(log => 
            log.fragment && log.fragment.name === "ProduceRegistered"
        );
        const produceId = event.args.id.toString();
        
        // confiriming the registration of produce 
        this.updateTransactionStatus(txId, 'confirmed', transaction.hash, receipt.blockNumber);
        
        const tx = this.transactionHistory.find(t => t.id === txId);
        if (tx) {
            tx.produceId = produceId;
            this.saveTransactionHistory();
        }

        return produceId;

    } catch (error) {
        this.updateTransactionStatus(txId, 'failed');
        console.error("Error registering produce:", error);
        throw error;
    }
}

    async updateProducePrice(produceId, newPriceInWei) {
        //checking if wallet is connected 
        if (!this.signer) {
            throw new Error("Please connect your wallet first");
        }
        //recording the transaction(changing the price )
        const txId = this.recordTransaction('price_update', produceId, {
            newPrice: newPriceInWei
        });

        try {
            // calling the contract to update the price 
            const transaction = await this.contract.updateProducePrice(
                produceId,
                newPriceInWei
            );
            //updating the transaction status
            this.updateTransactionStatus(txId, 'processing', transaction.hash);
           
            //waiting for confirmation of the changes 
            await transaction.wait();

            //confirming the changes 
            this.updateTransactionStatus(txId, 'confirmed', transaction.hash);
            
        } catch (error) {
            //in case of any error 
            this.updateTransactionStatus(txId, 'failed');
            throw error;
        }
    }

    async updateProduceStatus(produceId, newStatus) {
        //similar to produce price 
        if (!this.signer) {
            throw new Error("Please connect your wallet first");
        }

        const txId = this.recordTransaction('status_update', produceId, {
            newStatus: newStatus
        });

        try {
            const transaction = await this.contract.updateProduceStatus(
                produceId,
                newStatus
            );
            
            this.updateTransactionStatus(txId, 'processing', transaction.hash);
            await transaction.wait();
            this.updateTransactionStatus(txId, 'confirmed', transaction.hash);
            
        } catch (error) {
            this.updateTransactionStatus(txId, 'failed');
            throw error;
        }
    }

    async buyProduce(produceId, priceInWei) {
        if (!this.signer) {
            throw new Error("Please connect your wallet first");
        }
        // creating a local record (done this earlier)
        const txId = this.recordTransaction('sale', produceId, {
            priceInWei: priceInWei,
            buyer: this.userAddress
        });

        try {
            //calling smart contract's function...user will see a metamask pop up here
            const transaction = await this.contract.buyProduce(produceId, {
                value: priceInWei
            });

            //updating the local record 
            this.updateTransactionStatus(txId, 'processing', transaction.hash);
            
            //waiting 
            const receipt = await transaction.wait();

            //confirming the payment
            this.updateTransactionStatus(txId, 'confirmed', transaction.hash, receipt.blockNumber);
            
            return receipt;
        } catch (error) {
            this.updateTransactionStatus(txId, 'failed');
            throw error;
        }
    }


    async getProduceDetails(produceId) {
        try {
            const details = await this.contract.getProduceDetails(produceId);
            
            return {
                id: details[0].toString(),
                name: details[1],
                originalFarmer: details[2],
                currentSeller: details[3],
                currentStatus: details[4],
                priceInWei: details[5],
                originFarm: details[6],
                qrCode: details[7],
                registrationTimestamp: details[8]
            };
        } catch (error) {
            console.error("Error fetching produce details:", error);
            throw error;
        }
    }

    async getSaleHistory(produceId) {
        try {
            const saleRecords = await this.contract.getSaleHistory(produceId);
            
            return saleRecords.map(record => ({
                produceId: record.ProduceId.toString(),
                buyer: record.buyer,
                seller: record.seller,
                pricePaidInWei: record.pricePaidInWei,
                saleTimestamp: new Date(Number(record.SaleTimeStamp) * 1000).toLocaleString()
            }));
        } catch (error) {
            console.error("Error fetching sale history:", error);
            throw error;
        }
    }

    async getAvailableProduce(maxId = 50) {
        try {
            const availableProduce = [];
            
            for (let i = 1; i <= maxId; i++) {
                try {
                    const details = await this.getProduceDetails(i);
                    if (details.currentStatus !== "Sold") {
                        availableProduce.push(details);
                    }
                } catch (e) {
                    break;
                }
            }
            
            return availableProduce;
        } catch (error) {
            console.error("Error fetching available produce:", error);
            throw error;
        }
    }

    // shows user activity (like price change and produce update)
    saveTransactionHistory() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('marketplace_tx_history', 
                JSON.stringify(this.transactionHistory)
            );
        }
    }

    // to load the user activity in privious sessions 
    loadTransactionHistory() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('marketplace_tx_history');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    }

    //to record the users activity 
    recordTransaction(type, produceId, details = {}) {
        const transaction = {
            id: Date.now().toString(),
            type: type,
            produceId: produceId,
            userAddress: this.userAddress,
            timestamp: new Date().toISOString(),
            details: details,
            status: 'pending'
        };

        this.transactionHistory.unshift(transaction);
        this.saveTransactionHistory();
        return transaction.id;
    }
    // to  update the users activity 
    updateTransactionStatus(transactionId, status, txHash = null, blockNumber = null) {
        const transaction = this.transactionHistory.find(tx => tx.id === transactionId);
        if (transaction) {
            transaction.status = status;
            if (txHash) transaction.txHash = txHash;
            if (blockNumber) transaction.blockNumber = blockNumber;
            this.saveTransactionHistory();
        }
    }

    getTransactionHistory() {
        return this.transactionHistory;
    }


//event listners 
    listenForNewProduce(callback) {
        this.contract.on("ProduceRegistered", (id, name, farmer, originFarm) => {
            callback({
                id: id.toString(),
                name,
                farmer,
                originFarm
            });
        });
    }

    listenForSales(callback) {
        this.contract.on("ProduceSold", (id, buyer, seller, pricePaid) => {
            callback({
                id: id.toString(),
                buyer,
                seller,
                pricePaid: ethers.formatEther(pricePaid)
            });
        });
    }

    removeAllListeners() {
        this.contract.removeAllListeners();
    }
}

export default ProduceMarketplace;