import { avatarsContract } from "@/server/contracts/avatars"
import { createDiceBearAdapter } from "."

avatarsContract("DiceBear", createDiceBearAdapter)
