import { Router } from 'express';
import {
    
    getGadgets,
    createGadget,
    updateGadget,
    deleteGadget,
    confirmSelfDestruct,
    initiateSelfDestruct
} from '../controllers/gadget.controller';

const router = Router();

router.get('/', getGadgets);
router.post('/', createGadget);
router.patch('/:id', updateGadget);
router.delete('/:id', deleteGadget);
router.post('/:id/self-destruct', initiateSelfDestruct);
router.post('/:id/self-destruct/confirm', confirmSelfDestruct);

export default router;