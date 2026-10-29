# browserSetup.md: Phase 0 Remaining Steps

1. **Run both apps locally (0.6).** In `backend` and `frontend`, run `npm install`, copy `.env.example` to `.env` and fill in the values. Then run `npm run lint`, `typecheck`, `build` and `dev`. Confirm that `localhost:4000/health` returns `{status:"ok"}` and that the frontend page loads. This also checks the two config fixes.
2. **Supabase (0.4).** Create `detox-dev` and `detox-prod` (check the current free-tier project limit). Save the passwords in a password manager. Run `select 1;` in the SQL Editor and create no tables. Review the Data API exposure.
3. **Go live (0.7).**
   - Render: set the root directory to `backend` and the health check path to `/health`. Add the env vars `NODE_ENV`, `FRONTEND_ORIGIN` and `SESSION_SECRET`.
   - Vercel: set the root directory to `frontend` and `NEXT_PUBLIC_API_URL` to the Render URL.
   - Then fill in the live URLs in `README.md` and `project.md`.
4. **GitHub settings (0.2).** Turn on secret scanning with push protection, and branch protection on `main` that requires a PR and passing CI. Rule J1 depends on this. Set Render to deploy after CI passes.
5. **Pipeline drill (0.9).** On a branch, change the placeholder text and open a PR. CI should turn green and the Vercel preview should show the change, then merge it. Then add a deliberate type error on another branch and confirm CI blocks the merge. After that, practise a rollback on both Vercel and Render. Put the config fixes on a `chore/ci-config-fixes` branch and use it as the drill PR.
6. **Close out docs.**
   - Update the `project.md` status for Phase 0 and the learning log.
   - Fill in the env matrix.
   - Reconcile the missing `PRD.md` (write it, or remove the references to it).
   - Decide where the Phase 1 notes go: `docs/http-notes.md` or `docs/notes/`.
7. **Phase 0 checkpoint.** Tick the 7 items, including being able to explain CI, CD, where each secret lives, and why dev and prod databases are separate.

---

# Bringing Changes In From ParthGupta-dev's Fork (squash, no authorship carried over)

Run these in the main repo clone on the `kanishk07710` side. The squash applies the fork's changes as one new commit authored by whoever runs the commit, so the fork's commits never enter this repo's history.

```
git remote add friend https://github.com/ParthGupta-dev/Detox-Trecker.git
git fetch friend
git checkout -b feat/from-friend
git merge --squash friend/<branch-name>
git commit -m "feat: ..."        # authored by the person running this
git push origin feat/from-friend # then open a PR to main
```

Replace `<branch-name>` with the branch pushed to the fork (for example `chore/ci-config-fixes`).
