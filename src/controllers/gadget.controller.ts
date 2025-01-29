import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Gadget } from '../models/Gadget';
import { generateCodename } from '../utils/codename-generator';
import { CreateGadgetDto, UpdateGadgetDto } from '../types/gadget.types';
import crypto from "crypto";

const gadgetRepository = AppDataSource.getRepository(Gadget);



export const getGadgets = async (req: Request, res: Response): Promise<void> => {
  try {
      const { status } = req.query;
      const queryBuilder = gadgetRepository.createQueryBuilder('gadget');

      if (status) {
          const validStatuses = ['All', 'Active', 'Decommissioned', 'Destroyed'];
          if (!validStatuses.includes(status as string)) {
              res.status(400).json({ 
                  message: 'Invalid status. Must be one of: All, Active, Decommissioned, Destroyed' 
              });
              return;
          }

          // Apply status filter only if it's not 'All'
          if (status !== 'All') {
              queryBuilder.where('gadget.status = :status', { status });
          }
      } else {
          // Default behavior: exclude decommissioned gadgets
          queryBuilder.where('gadget.status != :status', { status: 'Decommissioned' });
      }

      queryBuilder.orderBy('gadget.createdAt', 'DESC');
      const gadgets = await queryBuilder.getMany();

      res.json({
          data: gadgets,
          total: gadgets.length
      });

  } catch (error) {
      console.error('Error fetching gadgets:', error);
      res.status(500).json({ message: 'Failed to fetch gadgets' });
  }
};

export const createGadget = async (
    req: Request<{}, {}, CreateGadgetDto>, 
    res: Response
): Promise<void> => {
    try {
        const { name, description } = req.body;
        const gadget = new Gadget();
        gadget.name = name;
        gadget.description = description;
        gadget.codename = generateCodename();

        let isUnique = false;
        while (!isUnique) {
            const existing = await gadgetRepository.findOne({ 
                where: { codename: gadget.codename }
            });
            if (!existing) {
                isUnique = true;
            } else {
                gadget.codename = generateCodename();
            }
        }

        await gadgetRepository.save(gadget);
        res.status(201).json(gadget);
    } catch (error) {
        res.status(500).json({ message: "Failed to create gadget" });
    }
};

export const updateGadget = async (
    req: Request<{ id: string }, {}, UpdateGadgetDto>,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const updates: UpdateGadgetDto = req.body;
        
        const gadget = await gadgetRepository.findOneBy({ id });
        if (!gadget) {
            res.status(404).json({ message: "Gadget not found" });
            return;
        }

        if (updates.name) gadget.name = updates.name;
        if (updates.description) gadget.description = updates.description;
        if (updates.status) gadget.status = updates.status;
        
        await gadgetRepository.save(gadget);
        
        res.json(gadget);
    } catch (error) {
        res.status(500).json({ message: "Failed to update gadget" });
    }
};

export const deleteGadget = async (
    req: Request<{ id: string }>,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const gadget = await gadgetRepository.findOneBy({ id });
        
        if (!gadget) {
            res.status(404).json({ message: "Gadget not found" });
            return;
        }

        gadget.status = 'Decommissioned';
        gadget.decommissionedAt = new Date();
        await gadgetRepository.save(gadget);

        res.json({ message: "Gadget decommissioned successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to decommission gadget" });
    }
};


interface SelfDestructRequestBody {
    confirmationCode: string;
}

interface PendingSelfDestruct {
    code: string;
    expiresAt: Date;
    attempts: number;
}

const pendingSelfDestructs = new Map<string, PendingSelfDestruct>();

const generateConfirmationCode = (): string => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const cleanupExpiredSequences = (): void => {
    const now = new Date();
    for (const [id, sequence] of pendingSelfDestructs.entries()) {
        if (sequence.expiresAt <= now) {
            pendingSelfDestructs.delete(id);
        }
    }
};

setInterval(cleanupExpiredSequences, 60 * 1000);

export const initiateSelfDestruct = async (
    req: Request<{ id: string }>,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            res.status(400).json({ message: "Invalid gadget ID" });
            return;
        }

        const gadget = await gadgetRepository.findOneBy({ id });

        if (!gadget) {
            res.status(404).json({ message: "Gadget not found" });
            return;
        }

        if (gadget.status === 'Decommissioned' || gadget.status === 'Destroyed') {
            res.status(400).json({ 
                message: `Cannot self-destruct a gadget in ${gadget.status} status` 
            });
            return;
        }

        const existingSequence = pendingSelfDestructs.get(id);
        if (existingSequence && existingSequence.expiresAt > new Date()) {
            res.status(409).json({ 
                message: "Self-destruct sequence already in progress",
                expiresAt: existingSequence.expiresAt,
                remainingAttempts: 3 - existingSequence.attempts
            });
            return;
        }

        const confirmationCode = generateConfirmationCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        pendingSelfDestructs.set(id, {
            code: confirmationCode,
            expiresAt,
            attempts: 0
        });

        res.json({
            message: "Self-destruct sequence initiated",
            confirmationCode,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error:any) {
        console.error('Self-destruct initiation error:', error);
        res.status(500).json({ 
            message: "Failed to initiate self-destruct sequence",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const confirmSelfDestruct = async (
    req: Request<{ id: string }, {}, SelfDestructRequestBody>,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { confirmationCode } = req.body;

        if (!confirmationCode || typeof confirmationCode !== 'string') {
            res.status(400).json({ message: "Invalid confirmation code format" });
            return;
        }

        const pendingDestruct = pendingSelfDestructs.get(id);
        const gadget = await gadgetRepository.findOneBy({ id });

        if (!gadget) {
            res.status(404).json({ message: "Gadget not found" });
            return;
        }

        if (!pendingDestruct) {
            res.status(400).json({ message: "No pending self-destruct sequence found" });
            return;
        }

        if (new Date() > pendingDestruct.expiresAt) {
            pendingSelfDestructs.delete(id);
            res.status(400).json({ message: "Confirmation code has expired" });
            return;
        }

        const isCodeValid = crypto.timingSafeEqual(
            Buffer.from(confirmationCode.toUpperCase()),
            Buffer.from(pendingDestruct.code)
        );

        pendingDestruct.attempts += 1;

        if (pendingDestruct.attempts >= 3) {
            pendingSelfDestructs.delete(id);
            res.status(400).json({ message: "Too many failed attempts. Self-destruct sequence aborted" });
            return;
        }

        if (!isCodeValid) {
            res.status(400).json({ 
                message: "Invalid confirmation code",
                remainingAttempts: 3 - pendingDestruct.attempts
            });
            return;
        }

        await gadgetRepository.update(id, {
            status: 'Destroyed',
            decommissionedAt: new Date()
        });

        pendingSelfDestructs.delete(id);

        res.json({
            message: "Self-destruct sequence completed successfully",
            gadget: await gadgetRepository.findOneBy({ id }) 
        });

    } catch (error:any) {
        console.error('Self-destruct confirmation error:', error);
        res.status(500).json({ 
            message: "Failed to complete self-destruct sequence",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};