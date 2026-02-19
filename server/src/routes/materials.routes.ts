import { Router, Request, Response } from 'express';
import { MaterialModel } from '../models/material.model.js';

const router = Router();

// GET /api/materials — all categories sorted by order
router.get('/', async (_req: Request, res: Response) => {
  const materials = await MaterialModel.find().sort({ order: 1 });
  res.json(materials);
});

// GET /api/materials/:id — single category
router.get('/:id', async (req: Request, res: Response) => {
  const material = await MaterialModel.findById(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json(material);
});

// POST /api/materials — create category
router.post('/', async (req: Request, res: Response) => {
  const material = await MaterialModel.create(req.body);
  res.status(201).json(material);
});

// PUT /api/materials/:id — update category
router.put('/:id', async (req: Request, res: Response) => {
  const material = await MaterialModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json(material);
});

// DELETE /api/materials/:id — delete category
router.delete('/:id', async (req: Request, res: Response) => {
  const material = await MaterialModel.findByIdAndDelete(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json({ message: 'Deleted' });
});

// POST /api/materials/:id/options — add option
router.post('/:id/options', async (req: Request, res: Response) => {
  const material = await MaterialModel.findById(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  material.options.push(req.body);
  await material.save();
  res.status(201).json(material);
});

// PUT /api/materials/:id/options/:optionId — update option
router.put('/:id/options/:optionId', async (req: Request, res: Response) => {
  const material = await MaterialModel.findById(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  const option = material.options.id(req.params.optionId as string);
  if (!option) {
    res.status(404).json({ error: 'Option not found' });
    return;
  }
  option.set(req.body);
  await material.save();
  res.json(material);
});

// DELETE /api/materials/:id/options/:optionId — remove option
router.delete('/:id/options/:optionId', async (req: Request, res: Response) => {
  const material = await MaterialModel.findById(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  const option = material.options.id(req.params.optionId as string);
  if (!option) {
    res.status(404).json({ error: 'Option not found' });
    return;
  }
  option.deleteOne();
  await material.save();
  res.json(material);
});

export default router;
