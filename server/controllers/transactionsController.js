const TransactionsSchema = require("../models/transactionsModel.js");
const PortfolioSchema = require("../models/userPortfolioModel.js");
const mongoose = require("mongoose");
const axios = require('axios');

const createTransaction = async (req, res) => {
  const { id, quantity, price, spent, date } = req.body;

  const user_id = req.user._id;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (!id) {
    return res.status(400).json({ error: "Please provide an ID" });
  }

  if (!quantity) {
    return res.status(400).json({ error: "Please provide a quantity" });
  }

  if (!price) {
    return res.status(400).json({ error: "Please provide a price" });
  }

  if (!spent) {
    return res.status(400).json({ error: "Please provide a spend" });
  }

  if (!date) {
    return res.status(400).json({ error: "Please provide a date" });
  }

  try {
    const transaction = await TransactionsSchema.create({
      id,
      quantity,
      price,
      spent,
      date,
      user_id,
    });

    let portfolio = await PortfolioSchema.findOne({ user_id: user_id });

    if (!portfolio) {
      res.status(404).json({
        error: "portfolio not found",
      });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransactionsByAddress = async (req, res) => {
  try {
    const evmAddress = req.query.evmAddress;
    if (!evmAddress) {
      return res.status(400).json({ error: "evmAddress query parameter undefined" });
    }

    const txs = await fetchTXEtherscan({ evmAddress });

    res.status(200).json({ transactions: txs });
  } catch (error) {
    res.status(500).json({
      error:
        "getTransactionsByAddress: " + error.message,
    });
  }
};

// const getTransactions = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const userFolio = await PortfolioSchema.findOne({
//       user_id: userId,
//     }).populate("transactions");

//     if (!userFolio) {
//       return res.status(404).json({ error: "Portfolio not found" });
//     }

//     res.status(200).json(userFolio.transactions);
//   } catch (error) {
//     res.status(500).json({
//       error:
//         "Une erreur s'est produite lors de la récupération du portfolio de l'utilisateur.",
//     });
//   }
// };


async function fetchTXEtherscan(args) {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (!ETHERSCAN_API_KEY) {
    throw Error("ETHERSCAN_API_KEY undefined");
  }
  if (!args.evmAddress) {
    throw Error("missing evmAddress");
  }
  if (!args.evmAddress.startsWith("0x")) {
    throw Error("invalid evmAddress"); // TODO: validate mixed case checksum?
  }

  const response = await axios.get('https://api.etherscan.io/api', {
    params: {
      module: 'account',
      action: 'txlist',
      address: args.evmAddress,
      startblock: 0,
      endblock: 99999999,
      page: 1,
      offset: 5, // Get only 5 transactions
      sort: 'desc', // Get most recent first
      apikey: ETHERSCAN_API_KEY
    }
  });

  if (response.data.status === '1' && response.data.result.length > 0) {
    // Transform the data to a more usable format
    return response.data.result.map(tx => ({
      hash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000), // Convert Unix timestamp to Date
      from: tx.from.toLowerCase(),
      to: tx.to.toLowerCase(),
      value: parseFloat(tx.value) / 1e18, // Convert from Wei to ETH
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed
    }));
  } else {
    throw new Error(response.data.message || 'No transactions found');
  }
}

module.exports = { createTransaction, getTransactionsByAddress };
