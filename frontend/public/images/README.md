# Character and scene art

The prototype draws its learners, tutors and scenes as stylised SVG illustrations
(`src/components/3d/Portrait.tsx`, `src/components/3d/Scene.tsx`), so it ships with no image assets.

For production, commission consistent **stylised 3D character renders** (adult learners from Ghana and
Anglophone Africa, warm editorial lighting, not photoreal) and place them here, e.g.:

```
images/learners/ama.webp
images/tutors/sophie-laurent.webp
images/scenes/meeting.webp
```

`<Portrait src="/images/learners/ama.webp" />` already accepts a `src` override, so renders can be swapped in
per person without changing layouts. Provide square crops (≥ 800 px) with the head centred in the upper half.
