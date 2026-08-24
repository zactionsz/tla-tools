import { runAction } from './action'
import { setFailed } from './github'

void runAction().catch(setFailed)
