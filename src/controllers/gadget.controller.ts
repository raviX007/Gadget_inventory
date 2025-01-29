import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Gadget } from '../models/Gadget';
import { generateCodename } from '../utils/codename-generator';
import { CreateGadgetDto, UpdateGadgetDto } from '../types/gadget.types';

const gadgetRepository = AppDataSource.getRepository(Gadget);

export const getAllGadgets = async (req: Request, res: Response): Promise<void> => {
    try {
        const gadgets = await gadgetRepository.find();
        const gadgetsWithProbability = gadgets.map(gadget => ({
            ...gadget,
            missionSuccessProbability: Math.floor(Math.random() * 41) + 60 // 60-100%
        }));
        res.json(gadgetsWithProbability);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve gadgets" });
    }
};

export const getGadgets = async (req: Request, res: Response): Promise<void> => {
  try {
      const { status } = req.query;

      // Build query with optional status filter
      const queryBuilder = gadgetRepository.createQueryBuilder('gadget');

      if (status) {
          // Validate status value
          const validStatuses = ['Active', 'Decommissioned', 'Destroyed'];
          if (!validStatuses.includes(status as string)) {
              res.status(400).json({ 
                  message: 'Invalid status. Must be one of: Active, Decommissioned, Destroyed' 
              });
              return;
          }

          queryBuilder.where('gadget.status = :status', { status });
      }

      // Add ordering by creation date (newest first)
      queryBuilder.orderBy('gadget.createdAt', 'DESC');

      const gadgets = await queryBuilder.getMany();

      res.json(gadgets);
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

        // Ensure unique codename
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

        // Only update allowed fields
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

// Store generated confirmation codes with expiration
const pendingSelfDestructs = new Map<string, {
  code: string;
  expiresAt: Date;
  attempts: number;
}>();

// Generate a random confirmation code
const generateConfirmationCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Initialize self-destruct sequence
export const initiateSelfDestruct = async (
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

      if (gadget.status === 'Decommissioned') {
          res.status(400).json({ message: "Cannot self-destruct a decommissioned gadget" });
          return;
      }

      // Generate new confirmation code
      const confirmationCode = generateConfirmationCode();
      
      // Store code with 5-minute expiration
      pendingSelfDestructs.set(id, {
          code: confirmationCode,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          attempts: 0
      });

      res.json({
          message: "Self-destruct sequence initiated",
          confirmationCode,
          expiresIn: "5 minutes"
      });

  } catch (error) {
      res.status(500).json({ message: "Failed to initiate self-destruct sequence" });
  }
};

// Confirm self-destruct sequence
export const confirmSelfDestruct = async (
  req: Request<{ id: string }, {}, SelfDestructRequestBody>,
  res: Response
): Promise<void> => {
  try {
      const { id } = req.params;
      const { confirmationCode } = req.body;

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

      // Check if code has expired
      if (new Date() > pendingDestruct.expiresAt) {
          pendingSelfDestructs.delete(id);
          res.status(400).json({ message: "Confirmation code has expired" });
          return;
      }

      // Increment attempts
      pendingDestruct.attempts += 1;

      // Check if too many attempts (max 3)
      if (pendingDestruct.attempts >= 3) {
          pendingSelfDestructs.delete(id);
          res.status(400).json({ message: "Too many failed attempts. Self-destruct sequence aborted" });
          return;
      }

      // Verify confirmation code
      if (confirmationCode !== pendingDestruct.code) {
          res.status(400).json({ 
              message: "Invalid confirmation code",
              remainingAttempts: 3 - pendingDestruct.attempts
          });
          return;
      }

      // Execute self-destruct
      gadget.status = 'Destroyed';
      gadget.decommissionedAt = new Date();
      await gadgetRepository.save(gadget);

      // Clean up pending self-destruct
      pendingSelfDestructs.delete(id);

      res.json({
          message: "Self-destruct sequence completed successfully",
          gadget
      });

  } catch (error) {
      res.status(500).json({ message: "Failed to complete self-destruct sequence" });
  }
};