import { sha256 } from './cryptography.js';
import { randomDelay } from '../ui/common.js';
const HASH_REQUIREMENT = '0000';
export class BlockchainNode {
    constructor() {
        this._chain = [];
        this._pendingTransactions = [];
        this._isMining = false;
    }
    initializeWith(blocks) {
        this._chain = [...blocks];
    }
    async initializeWithGenesisBlock() {
        const genesisBlock = await this.mineBlock({ previousHash: '0', timestamp: Date.now(), transactions: [] });
        this._chain.push(genesisBlock);
    }
    async mineBlock(block) {
        this._isMining = true;
        let hash = '';
        let nonce = 0;
        do {
            hash = await this.calculateHash(Object.assign(Object.assign({}, block), { nonce: ++nonce }));
        } while (!hash.startsWith(HASH_REQUIREMENT));
        this._isMining = false;
        this._pendingTransactions = [];
        return Object.assign(Object.assign({}, block), { hash, nonce });
    }
    async mineBlockWith(transactions) {
        // NOTE: INTRODUCING A RANDOM DELAY FOR DEMO PURPOSES.
        // We want to randomize block's timestamp creation so the node that generates transactions
        // doesn't have an advantage since it's timestamp will always be earlier.
        await randomDelay(500);
        const block = { previousHash: this.latestBlock.hash, timestamp: Date.now(), transactions };
        return this.mineBlock(block);
    }
    get isMining() {
        return this._isMining;
    }
    get chain() {
        return [...this._chain];
    }
    get chainIsEmpty() {
        return this._chain.length === 0;
    }
    get latestBlock() {
        return this._chain[this._chain.length - 1];
    }
    get pendingTransactions() {
        return [...this._pendingTransactions];
    }
    get hasPendingTransactions() {
        return this.pendingTransactions.length > 0;
    }
    get noPendingTransactions() {
        return this.pendingTransactions.length === 0;
    }
    addTransaction(transaction) {
        this._pendingTransactions.push(transaction);
    }
    /**
     * Attempts to add a block into the blockchain. The rejected promise carries the reason why the block wasn't added.
     */
    async addBlock(newBlock) {
        const errorMessagePrefix = `⚠️ Block "${newBlock.hash.substr(0, 8)}" is rejected`;
        // Find the block after which the new block should be added.
        const previousBlockIndex = this._chain.findIndex(b => b.hash === newBlock.previousHash);
        if (previousBlockIndex < 0) {
            throw new Error(`${errorMessagePrefix} - there is no block in the chain with the specified previous hash "${newBlock.previousHash.substr(0, 8)}".`);
        }
        // The current node may already have one or more blocks generated (or received from other nodes in the network),
        // after the one we attempt to add. In this case the longest chain takes precedence and the new block is rejected.
        const tail = this._chain.slice(previousBlockIndex + 1);
        if (tail.length >= 1) {
            throw new Error(`${errorMessagePrefix} - the longer tail of the current node takes precedence over the new block.`);
        }
        // Verify the hash of the new block against the hash of the previous block.
        const newBlockHash = await this.calculateHash(newBlock);
        const prevBlockHash = this._chain[previousBlockIndex].hash;
        const newBlockValid = newBlockHash.startsWith(HASH_REQUIREMENT) &&
            newBlock.previousHash === prevBlockHash &&
            newBlock.hash === newBlockHash;
        if (!newBlockValid) {
            throw new Error(`${errorMessagePrefix} - hash verification has failed.`);
        }
        // Append the new block at the end of the chain.
        this._chain = [...this._chain, newBlock];
    }
    async calculateHash(block) {
        const data = block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce;
        return sha256(data);
    }
}
//# sourceMappingURL=blockchain-node.js.map