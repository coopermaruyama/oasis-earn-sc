import { ONE } from '@dma-common/constants'
import BigNumber from 'bignumber.js'

export interface IRiskRatio {
  loanToValue: BigNumber
  colRatio: BigNumber
  multiple: BigNumber
}

export enum RISK_RATIO_CTOR_TYPE {
  LTV = 'LTV',
  COL_RATIO = 'COL_RATIO',
  MULITPLE = 'MULITPLE',
}

export class RiskRatio implements IRiskRatio {
  static TYPE = RISK_RATIO_CTOR_TYPE
  type: RISK_RATIO_CTOR_TYPE = RISK_RATIO_CTOR_TYPE.LTV
  loanToValue: BigNumber

  constructor(input: BigNumber, type: RISK_RATIO_CTOR_TYPE) {
    this.type = type

    switch (type) {
      case RiskRatio.TYPE.LTV:
        this.loanToValue = input
        break
      case RiskRatio.TYPE.COL_RATIO:
        this.loanToValue = ONE.div(input)
        break
      case RiskRatio.TYPE.MULITPLE:
        this.loanToValue = ONE.div(ONE.plus(ONE.div(input.minus(ONE))))
        break
      default:
        throw new Error(`Unrecognized RiskRatio constructor type: ${type}`)
    }
  }

  public get colRatio(): BigNumber {
    return ONE.div(this.loanToValue)
  }

  public get multiple(): BigNumber {
    return ONE.plus(ONE.div(ONE.div(this.loanToValue).minus(ONE)))
  }
}
