import BigNumber from "bignumber.js";
import { CHAINS, PROTOCOLS, AMM_TYPES } from "./sdk/config";
import { getLPValueByUserAndPoolFromPositions, getPositionAtBlock, getPositionDetailsFromPosition, getPositionsForAddressByPoolAtBlock } from "./sdk/subgraphDetails";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { promisify } from 'util';
import stream from 'stream';
import csv from 'csv-parser';
import fs from 'fs';


//Uncomment the following lines to test the getPositionAtBlock function

// const position = getPositionAtBlock(
//         0, // block number 0 for latest block
//         2, // position id
//         CHAINS.MODE, // chain id
//         PROTOCOLS.SUPSWAP, // protocol
//         AMM_TYPES.UNISWAPV3 // amm type
//     );
// position.then((position) => {
//     // print response
//     const result = getPositionDetailsFromPosition(position);
//     console.log(`${JSON.stringify(result,null, 4)}
//     `)
// });

interface LPValueDetails {
  pool: string;
  lpValue: string;
}

interface UserLPData {
  totalLP: string;
  pools: LPValueDetails[];
}

// Define an object type that can be indexed with string keys, where each key points to a UserLPData object
interface OutputData {
  [key: string]: UserLPData;
}


const pipeline = promisify(stream.pipeline);

// Assuming you have the following functions and constants already defined
// getPositionsForAddressByPoolAtBlock, CHAINS, PROTOCOLS, AMM_TYPES, getPositionDetailsFromPosition, getLPValueByUserAndPoolFromPositions, BigNumber

const readBlocksFromCSV = async (filePath: string): Promise<number[]> => {
  const blocks: number[] = [];
  await pipeline(
    fs.createReadStream(filePath),
    csv(),
    async function* (source) {
      for await (const chunk of source) {
        // Assuming each row in the CSV has a column 'block' with the block number
        if (chunk.block) blocks.push(parseInt(chunk.block, 10));
      }
    }
  );
  return blocks;
};


const getData = async () => {
  const snapshotBlocks = [
    3116208, 3159408, 3202608, 3245808, 3289008, 3332208,
    3375408, 3418608, 3461808, 3505008, 3548208, 3591408,
    3634608, 3677808, 3721008, 3764208, 3807408, 3850608,
    3893808, 3937008, 3980208, 3983003,
  ]; //await readBlocksFromCSV('src/sdk/mode_chain_daily_blocks.csv');
  
  // Object to hold the final structure for JSON output
  let outputData: OutputData = {};

  for (let block of snapshotBlocks) {
    const positions = await getPositionsForAddressByPoolAtBlock(
      block, "", "", CHAINS.MODE, PROTOCOLS.SUPSWAP, AMM_TYPES.UNISWAPV3
    );

    console.log(`Block: ${block}`);
    console.log("Positions: ", positions.length);

    let positionsWithUSDValue = positions.map(getPositionDetailsFromPosition);
    let lpValueByUsers = getLPValueByUserAndPoolFromPositions(positionsWithUSDValue);

    lpValueByUsers.forEach((value, key) => {
      if (!outputData[key]) {
        outputData[key] = { totalLP: "0", pools: [] };
      }

      let total = new BigNumber(outputData[key].totalLP);
      value.forEach((lpValue, poolKey) => {
        const lpValueStr = lpValue.toString();
        outputData[key].pools.push({ pool: poolKey, lpValue: lpValueStr });
        total = total.plus(lpValue);
      });

      outputData[key].totalLP = total.toString();
    });
  }

  // Writing the JSON output to a file
  fs.writeFile('outputData.json', JSON.stringify(outputData, null, 2), 'utf8', (err) => {
    if (err) {
      console.log("An error occurred while writing JSON Object to File.");
      return console.log(err);
    }
    console.log("JSON file has been saved.");
  });
};

getData().then(() => {
  console.log("Done");
});

// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap

