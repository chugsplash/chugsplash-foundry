import * as fs from 'fs'

import {
  chugsplashApproveAbstractTask,
  chugsplashDeployAbstractTask,
  chugsplashFundAbstractTask,
  chugsplashProposeAbstractTask,
  chugsplashRegisterAbstractTask,
  readParsedChugSplashConfig,
  monitorChugSplashSetup,
  ChugSplashExecutorType,
  chugsplashMonitorAbstractTask,
  chugsplashAddProposersAbstractTask,
  chugsplashWithdrawAbstractTask,
  chugsplashListProjectsAbstractTask,
  chugsplashListProposersAbstractTask,
  chugsplashCancelAbstractTask,
  chugsplashClaimProxyAbstractTask,
  chugsplashTransferOwnershipAbstractTask,
  readUserChugSplashConfig,
} from '@chugsplash/core'
import { BigNumber, ethers } from 'ethers'
import ora from 'ora'

import { fetchPaths, getArtifactPaths, initializeExecutor } from './utils'

const args = process.argv.slice(2)
const command = args[0]

;(async () => {
  switch (command) {
    case 'register': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      let owner = args[8];

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)

      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const config = await readParsedChugSplashConfig(provider, configPath, artifactPaths, "foundry")
      await provider.getNetwork()
      const address = await wallet.getAddress()
      owner = owner !== "self" ? owner : address

      console.log("-- ChugSplash Register --")
      await chugsplashRegisterAbstractTask(provider, wallet, config, owner, silent, 'foundry', process.stdout)
      break
    }
    case 'propose': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const ipfsUrl = args[8] !== "none" ? args[8] : undefined
      const remoteExecution = args[9] === 'true'
      const skipStorageCheck = args[10] === 'true'

      const { artifactFolder, buildInfoFolder,canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      const config = await readParsedChugSplashConfig(provider, configPath, artifactPaths, "foundry")
      await provider.getNetwork()
      await wallet.getAddress()


      console.log("-- ChugSplash Propose --")
      await chugsplashProposeAbstractTask(
        provider,
        wallet,
        config, 
        configPath, 
        ipfsUrl,
        silent,
        remoteExecution,
        false,
        'foundry',
        artifactPaths,
        buildInfoFolder,
        artifactFolder,
        canonicalConfigPath,
        skipStorageCheck,
        process.stdout
      )
      break
    }
    case 'fund': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const amount = BigNumber.from(args[8])

      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )
      
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()

      console.log("-- ChugSplash Fund --")
      await chugsplashFundAbstractTask(provider, wallet, configPath, amount, silent, artifactPaths, "foundry", process.stdout)
      break
    }
    case 'approve': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const withdrawFunds = args[8] === 'true'
      const skipMonitorStatus = args[9] === 'true'

      const { artifactFolder, buildInfoFolder, deploymentFolder, canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      const remoteExecution = args[3] !== 'localhost'

      console.log("-- ChugSplash Approve --")
      await chugsplashApproveAbstractTask(provider, wallet, configPath, !withdrawFunds, silent, skipMonitorStatus, artifactPaths, "foundry", buildInfoFolder, artifactFolder, canonicalConfigPath, deploymentFolder, remoteExecution, process.stdout)
      break
    }
    case 'deploy': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const withdrawFunds = args[8] === 'true'
      let newOwner = args[9]
      const ipfsUrl = args[10] !== "none" ? args[10] : undefined
      const skipStorageCheck = args[11] === 'true'
      
      const noCompile = true
      const confirm = true

      const logPath = `chugsplash/logs/${network ?? "anvil"}`
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true })
      }

      const now = new Date()
      const logWriter = fs.createWriteStream(`${logPath}/${now.toISOString()}`)

      const { artifactFolder, buildInfoFolder, deploymentFolder, canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      const address = await wallet.getAddress()
      newOwner = newOwner !== "self" ? newOwner : address

      const remoteExecution = args[3] !== 'localhost'
      const spinner = ora({ isSilent: silent, stream: logWriter })

      logWriter.write("-- ChugSplash Deploy --\n")
      let executor: ChugSplashExecutorType
      if (remoteExecution) {
        spinner.start('Waiting for the executor to set up ChugSplash...')
        await monitorChugSplashSetup(provider, wallet)
      } else {
        spinner.start('Booting up ChugSplash...')
        executor = await initializeExecutor(provider, privateKey, "error")
      }
    
      spinner.succeed('ChugSplash is ready to go.')
    
      const contractArtifacts = await chugsplashDeployAbstractTask(
        provider,
        wallet,
        configPath,
        silent,
        remoteExecution,
        ipfsUrl,
        noCompile,
        confirm,
        withdrawFunds,
        newOwner ?? await wallet.getAddress(),
        artifactPaths,
        buildInfoFolder,
        artifactFolder,
        canonicalConfigPath,
        deploymentFolder,
        'foundry',
        skipStorageCheck,
        executor,
        logWriter
      )

      const artifactStructABI = 'tuple(string referenceName, string contractName, address contractAddress)[]'
      const encodedArtifacts = ethers.utils.AbiCoder.prototype.encode(
        [artifactStructABI],
        [contractArtifacts]
      );

      process.stdout.write(encodedArtifacts)
      break
    }
    case 'monitor': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const withdrawFunds = args[8] === 'true'
      let newOwner = args[9]

      const { artifactFolder, buildInfoFolder, deploymentFolder, canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      const address = await wallet.getAddress()
      newOwner = newOwner !== "self" ? newOwner : address

      const remoteExecution = args[3] !== 'localhost'

      console.log("-- ChugSplash Monitor --")
      await chugsplashMonitorAbstractTask(provider, wallet, configPath, !withdrawFunds, silent, newOwner, artifactPaths, buildInfoFolder, artifactFolder, canonicalConfigPath, deploymentFolder, "foundry", remoteExecution, process.stdout)
      break
    }
    case 'cancel': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const outPath = args[5]
      const buildInfoPath = args[6]

      const { artifactFolder, buildInfoFolder, deploymentFolder, canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash Cancel --")
      await chugsplashCancelAbstractTask(provider, wallet, configPath, artifactPaths, "foundry", process.stdout)
      break
    }
    case 'withdraw': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]

      const { artifactFolder, buildInfoFolder, canonicalConfigPath } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash Withdraw --")
      await chugsplashWithdrawAbstractTask(provider, wallet, configPath, silent, artifactPaths, buildInfoFolder, artifactFolder, canonicalConfigPath, "foundry", process.stdout)
      break
    }
    case 'listProjects': {
      const rpcUrl = args[1]
      const network = args[2] !== "localhost" ? args[2] : undefined
      const privateKey = args[3]

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash List Projects --")
      await chugsplashListProjectsAbstractTask(provider, wallet, "foundry", process.stdout)
      break
    }
    case 'listProposers': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const outPath = args[5]
      const buildInfoPath = args[6]

      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash List Proposers --")
      await chugsplashListProposersAbstractTask(provider, wallet, configPath, artifactPaths, "foundry")
      break
    }
    case 'addProposer': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const outPath = args[5]
      const buildInfoPath = args[6]
      const newProposer = args[7]

      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash Add Proposer --")
      await chugsplashAddProposersAbstractTask(provider, wallet, configPath, [newProposer],artifactPaths, "foundry", process.stdout)
      break
    }
    case 'claimProxy': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const referenceName = args[8]

      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash Claim Proxy --")
      await chugsplashClaimProxyAbstractTask(provider, wallet, configPath, referenceName, silent, artifactPaths, "foundry", process.stdout)
      break
    }
    case 'transferProxy': {
      const configPath = args[1]
      const rpcUrl = args[2]
      const network = args[3] !== "localhost" ? args[3] : undefined
      const privateKey = args[4]
      const silent = args[5] === 'true'
      const outPath = args[6]
      const buildInfoPath = args[7]
      const proxyAddress = args[8]


      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network)
      const wallet = new ethers.Wallet(privateKey, provider)
      await provider.getNetwork()
      await wallet.getAddress()

      console.log("-- ChugSplash Transfer Proxy --")
      await chugsplashTransferOwnershipAbstractTask(provider, wallet, configPath, proxyAddress, silent, artifactPaths, "foundry", process.stdout)
      break
    }
    case 'getAddress': {
      const rpcUrl = args[1]
      const configPath = args[2]
      const referenceName = args[3]
      const outPath = args[4]
      const buildInfoPath = args[5]
      
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const { artifactFolder, buildInfoFolder } = fetchPaths(outPath, buildInfoPath)
      const userConfig = readUserChugSplashConfig(configPath)
      const artifactPaths = await getArtifactPaths(
        userConfig.contracts,
        artifactFolder,
        buildInfoFolder
      )

      const parsedConfig = await readParsedChugSplashConfig(provider, configPath, artifactPaths, "foundry")
      process.stdout.write(parsedConfig.contracts[referenceName].proxy)
    }
  }
})().catch((err: Error) => {
  console.error(err)
  process.stdout.write('')
})
