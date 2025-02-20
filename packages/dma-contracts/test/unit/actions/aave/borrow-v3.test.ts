import AavePoolAbi from '@abis/external/protocols/aave/v3/pool.json'
import { FakeContract, smock } from '@defi-wonderland/smock'
import { loadContractNames } from '@deploy-configurations/constants'
import { Network } from '@deploy-configurations/types/network'
import { ServiceRegistry } from '@deploy-configurations/utils/wrappers'
import { createDeploy } from '@dma-common/utils/deploy'
import init from '@dma-common/utils/init'
import { calldataTypes } from '@dma-library'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Pool } from '@typechain/abis/external/protocols/aave/v3'
import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'

const utils = ethers.utils
chai.use(smock.matchers)
const SERVICE_REGISTRY_NAMES = loadContractNames(Network.MAINNET)

describe('AAVE | BorrowV3 Action | Unit', () => {
  let provider: JsonRpcProvider
  let borrowV3Action: Contract
  let borrowV3ActionAddress: string
  let snapshotId: string
  let fakePool: FakeContract<Pool>

  const expectedValues = {
    asset: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    amount: 1000,
    to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  }

  before(async () => {
    const config = await init()
    provider = config.provider
    const signer = config.signer

    const deploy = await createDeploy({ config })
    const delay = 0
    const [, serviceRegistryAddress] = await deploy('ServiceRegistry', [delay])
    const registry = new ServiceRegistry(serviceRegistryAddress, signer)
    const [, operationExecutorAddress] = await deploy('OperationExecutor', [serviceRegistryAddress])
    const [, operationStorageAddress] = await deploy('OperationStorage', [
      serviceRegistryAddress,
      operationExecutorAddress,
    ])

    fakePool = await smock.fake<Pool>(AavePoolAbi)
    fakePool.borrow.returns()

    await registry.addEntry(SERVICE_REGISTRY_NAMES.aave.v3.AAVE_POOL, fakePool.address)
    await registry.addEntry(
      SERVICE_REGISTRY_NAMES.common.OPERATION_STORAGE,
      operationStorageAddress,
    )

    const [_borrowV3Action, _borrowV3ActionAddress] = await deploy('AaveV3Borrow', [
      serviceRegistryAddress,
    ])
    borrowV3Action = _borrowV3Action
    borrowV3ActionAddress = _borrowV3ActionAddress
  })

  beforeEach(async () => {
    snapshotId = await provider.send('evm_snapshot', [])

    await borrowV3Action.execute(
      utils.defaultAbiCoder.encode(
        [calldataTypes.aaveV3.Borrow],
        [
          {
            asset: expectedValues.asset,
            amount: expectedValues.amount,
            to: expectedValues.to,
          },
        ],
      ),
      [],
    )
  })

  afterEach(async () => {
    await provider.send('evm_revert', [snapshotId])
  })

  it('should call borrow on AAVE V3 Pool with expected params', async () => {
    const defaultInterestRateModeInAction = 2
    const defaultReferralCodeInAction = 0
    expect(fakePool.borrow).to.be.calledWith(
      expectedValues.asset,
      expectedValues.amount,
      defaultInterestRateModeInAction,
      defaultReferralCodeInAction,
      borrowV3ActionAddress,
    )
  })
})
