// Compile Solidity contracts using solc-js
// Run with: node scripts/compile.js

import solc from 'solc';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File resolver for imports
function findImports(importPath) {
  try {
    // Handle OpenZeppelin imports
    if (importPath.startsWith('@openzeppelin/')) {
      const oZPath = path.join(__dirname, '../node_modules', importPath);
      // Check if path already has .sol extension
      const fullPath = oZPath.endsWith('.sol') ? oZPath : oZPath + '.sol';
      const content = fs.readFileSync(fullPath, 'utf8');
      return { contents: content };
    }

    // Handle Somnia imports
    if (importPath.startsWith('@somnia-chain/')) {
      const somniaPath = path.join(__dirname, '../node_modules', importPath);
      const fullPath = somniaPath.endsWith('.sol') ? somniaPath : somniaPath + '.sol';
      const content = fs.readFileSync(fullPath, 'utf8');
      return { contents: content };
    }

    // Handle relative imports
    const fullPath = path.resolve(__dirname, '../contracts', importPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return { contents: content };
  } catch (e) {
    return { error: `File not found: ${importPath}` };
  }
}

async function main() {
  console.log("🔨 Compiling Solidity contracts...\n");

  const contractsDir = path.join(__dirname, '../contracts');
  const artifactsDir = path.join(__dirname, '../artifacts/contracts');

  // Create artifacts directory
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Read contract files
  const contracts = [
    { name: 'ReactiveNFT', file: 'ReactiveNFT.sol' },
    { name: 'ReactiveNFTAuction', file: 'ReactiveNFTAuction.sol' },
  ];

  console.log(`⚙️  Using solc version ${solc.version()}...`);

  const input = {
    language: 'Solidity',
    sources: {},
    settings: {
      viaIR: true,
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  // Load contract source code
  for (const contract of contracts) {
    const contractPath = path.join(contractsDir, contract.file);
    if (fs.existsSync(contractPath)) {
      const sourceCode = fs.readFileSync(contractPath, 'utf8');
      input.sources[`contracts/${contract.file}`] = {
        content: sourceCode,
      };
      console.log(`📄 Loaded: ${contract.file}`);
    } else {
      console.log(`⚠️  Not found: ${contract.file}`);
    }
  }

  console.log("\n⚙️  Compiling...\n");

  // Compile with file resolver
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  // Check for errors
  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error(`❌ ${error.formattedMessage}`);
        process.exit(1);
      } else {
        console.log(`⚠️  ${error.formattedMessage}`);
      }
    }
  }

  // Save artifacts
  for (const contract of contracts) {
    const contractOutput = output.contracts?.[`contracts/${contract.file}`]?.[contract.name];
    
    if (contractOutput) {
      const artifactPath = path.join(artifactsDir, `${contract.name}.json`);
      const artifact = {
        abi: contractOutput.abi,
        bytecode: contractOutput.evm.bytecode.object,
        deployedBytecode: contractOutput.evm.deployedBytecode.object,
      };

      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
      console.log(`✅ Compiled: ${contract.name}.json`);
    }
  }

  console.log("\n✨ Compilation complete!");
  console.log(`📁 Artifacts saved to: ${artifactsDir}`);
  console.log("\nNext step: npm run deploy");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
