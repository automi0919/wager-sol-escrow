import {
  Connection,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import BN = require("bn.js");
import {
  getKeypair,
  getProgramId,
} from "./utils";

const init_escrow = async () => {

  const escrowKeypair = getKeypair("escrow");
  console.log("escrow:", escrowKeypair.publicKey.toBase58());

  const aliceKeypair = getKeypair("alice");
  console.log("alice :", aliceKeypair.publicKey.toBase58());

  const bobKeypair = getKeypair("bob");
  console.log("bob :", bobKeypair.publicKey.toBase58());

  // const connection = new Connection("https://api.testnet.solana.com", "confirmed");
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  // console.log("Requesting SOL for Alice...");
  // some networks like the local network provide an airdrop function (mainnet of course does not)
  // await connection.requestAirdrop(aliceKeypair.publicKey, LAMPORTS_PER_SOL * 100);

  // console.log("Requesting SOL for Bob...");
  // await connection.requestAirdrop(bobKeypair.publicKey, LAMPORTS_PER_SOL * 100);

  const escrowProgramId = getProgramId();

  const withdrawIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: escrowKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: aliceKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: bobKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: aliceKeypair.publicKey, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(
        Uint8Array.of(
          1,  // 0 : init    1 : exchange   2 : cancel  3: create ATA Alice 4: create ATA Bob
          1,
          ...new BN(0.3 * LAMPORTS_PER_SOL).toArray("le", 8),     //  if sol ==0, it should never being here
        )
    ),
  });

  const tx = new Transaction().add(
    withdrawIx
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
    console.log("withdraw transaction successed!");
  }
  catch (e) {
    console.log("error===>", e)
  }
};

init_escrow();
