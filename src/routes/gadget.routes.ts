import { Router } from 'express';
import {
    getAllGadgets,
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
router.post('/gadgets/:id/self-destruct', initiateSelfDestruct);
router.post('/gadgets/:id/self-destruct/confirm', confirmSelfDestruct);

export default router;