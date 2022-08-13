import {
  Connection,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import BN = require("bn.js");
import {
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getKeypair,
  getProgramId,
  writePrivateKey,
  writePublicKey
} from "./utils";

const init_escrow = async () => {

  const escrowKeypair = Keypair.generate();
  console.log("escrow:", escrowKeypair.publicKey.toBase58());
  writePublicKey(escrowKeypair.publicKey, `escrow`);
  writePrivateKey(escrowKeypair.secretKey, `escrow`);

  const aliceKeypair = getKeypair("alice");
  console.log("alice :", aliceKeypair.publicKey.toBase58());

  // const connection = new Connection("https://api.testnet.solana.com", "confirmed");
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  // console.log("Requesting SOL for Alice...");
  // some networks like the local network provide an airdrop function (mainnet of course does not)
  // await connection.requestAirdrop(aliceKeypair.publicKey, LAMPORTS_PER_SOL * 100);

  // console.log("Requesting SOL for Bob...");
  // await connection.requestAirdrop(bobKeypair.publicKey, LAMPORTS_PER_SOL * 100);

  const escrowProgramId = getProgramId();

  
  const createEscrowAccountIx = SystemProgram.createAccount({
    space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      ESCROW_ACCOUNT_DATA_LAYOUT.span
    ),
    fromPubkey: aliceKeypair.publicKey,
    newAccountPubkey: escrowKeypair.publicKey,
    programId: escrowProgramId,
  });

  const initEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: aliceKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: escrowKeypair.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner:false, isWritable:false },
    ],
    data: Buffer.from(
        Uint8Array.of(
          0,  // 0 : init    1 : exchange   2 : cancel  3: create ATA Alice 4: create ATA Bob
          1,
          ...new BN(0.1 * LAMPORTS_PER_SOL).toArray("le", 8),     //  if sol ==0, it should never being here
        )
    ),
  });

  const tx = new Transaction().add(
    createEscrowAccountIx,
    initEscrowIx
  );

  // console.log("tx:", tx);
  console.log("Sending Alice's transaction...\n");

  try {
    await connection.sendTransaction(
      tx,
      [
        aliceKeypair, 
        escrowKeypair
      ],
      { skipPreflight: false, preflightCommitment: "confirmed" }
    );
    console.log("creator init transaction successed!");
  }
  catch (e) {
    console.log("error===>", e)
  }

};

init_escrow();
