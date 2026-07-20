import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getProjects, createProject, getProjectById, deleteProject } from '../controllers/projectController';
import { authenticateToken } from '../middlewares/auth';
import Document from '../models/Document';

const router = Router();

// Setup Multer storage
import os from 'os';
const uploadDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are supported.') as any);
    }
  }
});

router.use(authenticateToken as any);

router.get('/', getProjects as any);
router.post('/', createProject as any);
router.get('/:id', getProjectById as any);
router.delete('/:id', deleteProject as any);

// PRD Upload Endpoint
router.post('/:id/prd', upload.single('file'), async (req: any, res: Response | any) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // Determine file type
    let fileType: 'pdf' | 'docx' | 'txt' = 'txt';
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') fileType = 'pdf';
    else if (ext === '.docx') fileType = 'docx';

    // Mock text extraction (for simplicity in direct imports or if dependencies fail,
    // we can parse TXT directly and return mocked requirements if pdf/docx)
    let extractedText = `Uploaded document: ${file.originalname}\n`;
    if (ext === '.txt') {
      extractedText += fs.readFileSync(file.path, 'utf-8');
    } else {
      // In production, we'd use pdf-parse or mammoth.
      // Here, we provide standard text based on the file name to feed the agent.
      extractedText += `Mocked contents for document context of ${file.originalname}. Technical specifications inside.`;
    }

    const doc = new Document({
      projectId: id as any,
      name: file.originalname,
      filePath: file.path,
      fileType,
      extractedText
    });

    await doc.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: doc._id,
        name: doc.name,
        fileType: doc.fileType
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
