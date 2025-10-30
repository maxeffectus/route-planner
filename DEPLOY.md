# GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages on every push to the `main` branch.

## Initial Setup

### 1. Enable GitHub Pages in repository settings

1. Go to **Settings** → **Pages**
2. Under **Source**, select:
   - Source: **GitHub Actions**
3. Save settings

### 2. Verify base path in vite.config.js

Make sure the `base` in `vite.config.js` matches your repository name:

```javascript
base: '/route_planner/', // Replace with your repository name
```

If your repository has a different name, change this value accordingly.

### 3. Push changes

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

## Automatic Deployment

After initial setup:

1. **Every push to `main`** automatically triggers build and deployment
2. Deployment status can be viewed in the **Actions** tab
3. After successful deployment, the site will be available at:
   ```
   https://<your-username>.github.io/route_planner/
   ```

## Manual Deployment

You can also trigger deployment manually:

1. Go to the **Actions** tab
2. Select the **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

## Local Production Build Testing

Before deploying, you can test the production build locally:

```bash
npm run build
npm run preview
```

This will start a local server with the production version of the application.

## Notes

- The `dist` folder should not be in Git (it's in `.gitignore`)
- GitHub Actions will automatically create a `gh-pages` branch (don't touch it)
- Deployment time is typically 2-3 minutes
- First deployment may take up to 10 minutes for GitHub Pages activation

## Troubleshooting

### Site not loading (404)

1. Verify that `base` in `vite.config.js` matches the repository name
2. Check that **GitHub Actions** is selected as the source in Settings → Pages

### Deployment not starting

1. Verify that you have the `.github/workflows/deploy.yml` file
2. Check the Actions tab - there may be errors

### CSS/JS not loading

Issue with `base` path in `vite.config.js`. Make sure it's correct.

