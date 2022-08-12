use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke},
    program_error::ProgramError,
    system_instruction,
    sysvar::{rent::Rent, Sysvar}, 
    program_pack::Pack,
};

use crate::{error::EscrowError, instruction::EscrowInstruction, state::Escrow};

pub struct Processor;
impl Processor {
    pub fn process(
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        msg!("Process -> Instruction");
        let instruction = EscrowInstruction::unpack(instruction_data)?;

        msg!("Instruction -> Init");
        match instruction {
            EscrowInstruction::InitEscrow { is_cretor, amount } => {
                msg!("Instruction: InitEscrow");
                Self::process_init_escrow(accounts, is_cretor, amount)
            }
            EscrowInstruction::WithdrawEscrow { result, amount} => {
                msg!("Instruction: WithdrawEscrow");
                Self::process_withdraw(accounts, result, amount)
            }
        }
    }

    fn process_init_escrow(
        accounts: &[AccountInfo],
        is_cretor: u8,
        amount: u64,
    ) -> ProgramResult {

        let account_info_iter = &mut accounts.iter();

        let sender = next_account_info(account_info_iter)?;
        // msg!("Taker Pubkey : {}", taker_account.key);

        if !sender.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let escrow_account = next_account_info(account_info_iter)?;
        // msg!("Escrow account Pubkey : {}", escrow_account.key );

        let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

        if !rent.is_exempt(escrow_account.lamports(), escrow_account.data_len()) {
            return Err(EscrowError::NotRentExempt.into());
        }

        let system_program_account = next_account_info(account_info_iter)?;

        {
            let mut escrow_info = Escrow::unpack_unchecked(&escrow_account.data.borrow())?;
    
            escrow_info.is_initialized = true;
            if is_cretor == 1 {
                escrow_info.creator_pubkey = *sender.key;
                escrow_info.amount = amount;
            }
            else {
                escrow_info.competitor_pubkey = *sender.key;
                escrow_info.amount += amount;
            }
        }


        //----- Transfer Some Sol from Initializer to escrow
        Self::transfer_sol(
            &[
                sender.clone(),     //source
                escrow_account.clone(),     //destination
                system_program_account.clone(),
            ],
            amount
        )?;

        Ok(())
    }

    //==========================================================================
    fn process_withdraw(
        accounts: &[AccountInfo],
        result: u8,
        amount: u64,
    ) -> ProgramResult {

        let account_info_iter = &mut accounts.iter();

        let escrow_account = next_account_info(account_info_iter)?;
        // msg!("Escrow account Pubkey : {}", escrow_account.key );

        if !escrow_account.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let escrow_info = Escrow::unpack(&escrow_account.data.borrow())?;

        let creator = next_account_info(account_info_iter)?;
        
        if escrow_info.creator_pubkey != *creator.key {
            return Err(ProgramError::InvalidAccountData);
        }

        let competitor;
        if result == 1 {
            competitor = next_account_info(account_info_iter)?;

            if escrow_info.competitor_pubkey != *competitor.key {
                return Err(ProgramError::InvalidAccountData);
            }
        }

        let withdraw_account = next_account_info(account_info_iter)?;
        // msg!("withdraw_account : {}", withdraw_account.key);
        
        if amount != escrow_info.amount {
            return Err(EscrowError::InvalidAmount.into());
        }

        // msg!("Closing the escrow account...");
        **withdraw_account.try_borrow_mut_lamports()? = withdraw_account
            .lamports()
            .checked_add(escrow_account.lamports())
            .ok_or(EscrowError::AmountOverflow)?;
        **escrow_account.try_borrow_mut_lamports()? = 0;
        *escrow_account.try_borrow_mut_data()? = &mut [];
       
        Ok(())
    }

    fn transfer_sol(
        accounts: &[AccountInfo], 
        lamports: u64,
    ) -> ProgramResult{
        let account_info_iter = &mut accounts.iter();

        let source_acc = next_account_info(account_info_iter)?;
        let dest_acc = next_account_info(account_info_iter)?;
        let system_program_acc = next_account_info(account_info_iter)?;

        let sol_ix = system_instruction::transfer(
            source_acc.key,
            dest_acc.key,
            lamports,
        );
        invoke(
            &sol_ix,
            &[
                source_acc.clone(),
                dest_acc.clone(),
                system_program_acc.clone()
            ],
        )?;

        Ok(())
    }

}

