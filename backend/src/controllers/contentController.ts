import { OPENING_VIDEO_MAX_SECONDS, type ContentUser, type TransitionAction } from '@laporte/shared';
import type { Request, Response } from 'express';
import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import multer from 'multer';
import { env } from '../config/env';
import { contentService } from '../services/contentService';
import { AppError, notFound } from '../utils/errors';
import { nextId } from '../utils/ids';
import { mp4DurationSeconds } from '../utils/mediaDuration';
import { mediaMetaSchema } from '../validators/schemas';

const user = (req: Request): ContentUser => req.demoUser;

const uploadDir = env.uploadDir ? resolve(process.cwd(), env.uploadDir) : join(tmpdir(), 'laporte-uploads');
const ACCEPTED = /^(video\/(mp4|quicktime|webm)|audio\/(mpeg|mp4|x-m4a|aac|wav|x-wav|webm|ogg))$/;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => cb(null, `${nextId('file')}-${Date.now().toString(36)}${extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6)}`),
  }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ACCEPTED.test(file.mimetype) ? cb(null, true) : cb(new AppError(415, 'unsupported_media', 'Upload MP4, MOV or WebM video, or MP3, M4A, WAV or OGG audio.')),
});

const ACTIONS: TransitionAction[] = ['submit', 'publish', 'request-changes', 'archive', 'restore'];

export const contentController = {
  view: (req: Request, res: Response) => res.json(contentService.view(user(req))),

  createLesson: (req: Request, res: Response) => res.status(201).json(contentService.createLesson(user(req), req.body)),
  updateLesson: (req: Request, res: Response) => res.json(contentService.updateLesson(user(req), req.params.id, req.body.patch, req.body.version)),
  transition: (req: Request, res: Response) => {
    const action = req.params.action as TransitionAction;
    if (!ACTIONS.includes(action)) throw notFound('Action');
    res.json(contentService.transition(user(req), req.params.id, action, req.body.note));
  },

  /**
   * Stores the file, then measures its real duration on the server for MP4/MOV/M4A so length
   * rules cannot be bypassed. For other containers the browser-measured duration is used.
   */
  uploadMedia: (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(400, 'file_required', 'Choose a file to upload.');
    try {
      const meta = mediaMetaSchema.parse(req.body);
      const kind = file.mimetype.startsWith('video/') ? 'video' : 'audio';
      const measured = /mp4|quicktime|m4a/.test(file.mimetype) ? mp4DurationSeconds(file.path) : null;
      const durationSec = Math.round((measured ?? meta.durationSec) * 10) / 10;
      if (kind === 'video' && durationSec > OPENING_VIDEO_MAX_SECONDS)
        throw new AppError(422, 'video_too_long', `Videos must be 6 minutes or shorter (this file is ${clock(durationSec)}).`);
      const stored = { fileName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, durationSec, storageKey: basename(file.path) };
      const out = meta.replaceId
        ? contentService.replaceMediaFile(user(req), meta.replaceId, { ...stored, url: `/api/content/media/${meta.replaceId}/file` })
        : contentService.addUploadedMedia(user(req), { kind, title: meta.title, accent: meta.accent, speaker: meta.speaker, transcript: meta.transcript, url: null, ...stored });
      res.status(201).json({ ...out, measuredOnServer: measured !== null });
    } catch (err) {
      if (existsSync(file.path)) unlinkSync(file.path);
      throw err;
    }
  },

  /** Streams an uploaded file with HTTP range support so video can seek. */
  mediaFile: (req: Request, res: Response) => {
    const asset = contentService.media(req.params.id);
    const path = asset?.storageKey ? resolve(uploadDir, basename(asset.storageKey)) : undefined;
    if (!asset || !path || !existsSync(path)) throw notFound('Media file');
    const size = statSync(path).size;
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    res.setHeader('Content-Type', asset.mimeType ?? 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      return createReadStream(path, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', size);
    createReadStream(path).pipe(res);
  },

  deleteMedia: (req: Request, res: Response) => {
    const asset = contentService.media(req.params.id);
    const out = contentService.deleteMedia(user(req), req.params.id);
    if (asset?.storageKey) {
      const path = resolve(uploadDir, basename(asset.storageKey));
      if (existsSync(path)) unlinkSync(path);
    }
    res.json(out);
  },

  setEditors: (req: Request, res: Response) => res.json(contentService.setEditors(user(req), req.params.courseId, req.body.tutorIds)),
  createPack: (req: Request, res: Response) => res.status(201).json(contentService.savePack(user(req), req.body)),
  updatePack: (req: Request, res: Response) => res.json(contentService.savePack(user(req), req.body, req.params.id)),
  assignPack: (req: Request, res: Response) => res.status(201).json(contentService.assignPack(user(req), req.body)),
  submitAssignment: (req: Request, res: Response) => res.json(contentService.submitAssignment(user(req), req.params.id, req.body.response)),
  reviewAssignment: (req: Request, res: Response) => res.json(contentService.reviewAssignment(user(req), req.params.id, req.body.feedback)),
  completeLesson: (req: Request, res: Response) => res.json(contentService.completeLesson(user(req), req.params.id, req.body.quizScore)),
  claimQuest: (req: Request, res: Response) => res.json(contentService.claimQuest(user(req), req.body.questId)),
  placement: (req: Request, res: Response) => res.status(201).json(contentService.recordPlacement(user(req), req.body)),
};
