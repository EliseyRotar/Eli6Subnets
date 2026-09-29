import { describe, it, expect } from 'vitest'
import * as calc from '../src/calc'

describe('scaffold', () => {
  it('project is set up', () => {
    expect(true).toBe(true)
  })
})

describe('calc barrel', () => {
  it('re-exports every calculation module', () => {
    expect(typeof calc.ipToUint32).toBe('function')
    expect(typeof calc.calcSubnet).toBe('function')
    expect(typeof calc.allocateVlsm).toBe('function')
    expect(typeof calc.splitEqual).toBe('function')
    expect(typeof calc.summarise).toBe('function')
    expect(typeof calc.isValidationFailure).toBe('function')
  })
})
