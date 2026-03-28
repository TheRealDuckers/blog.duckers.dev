const OWNER = 'TheRealDuckers';
const REPO = 'blog.duckers.dev';
const GITHUB_CLIENT_ID = ' Iv23liTZipusDb4gSobG';

const PROFILE = {
  name: 'Duckers Blog',
  bio: 'Software engineer & internet enjoyer',
  avatar: 'https://github.com/TheRealDuckers.png'
};

const EXCLUDED_LABELS = ['bug', 'enhancement', 'help wanted', 'good first issue', 'question', 'wontfix', 'duplicate', 'invalid', 'documentation'];
const IGNORED_PREFIXES = ['blog:', 'area:', 'priority:', 'status:', 'closed', 'needs:'];

const BASE_URL = 'https://blog.duckers.dev';

const state = {
  posts: [],
  loading: true,
  error: null,
  user: null,
  token: null
};

function initProfile() {
  document.getElementById('profile-name').textContent = PROFILE.name;
  document.getElementById('profile-pic').src = PROFILE.avatar;
  document.querySelector('.profile-info .bio').textContent = PROFILE.bio;
}

function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function calculateReadingTime(text) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

function renderMarkdown(text) {
  if (!text) return '';
  
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><(h[123]|ul|blockquote|pre|li)/g, '<$1');
  html = html.replace(/<\/(h[123]|ul|blockquote|pre)><\/p>/g, '</$1>');
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<li>)/g, '$1');
  html = html.replace(/(<\/li>)<\/p>/g, '$1');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  return html;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getPostTags(labels) {
  return labels
    .filter(l => {
      const name = l.name.toLowerCase();
      return !EXCLUDED_LABELS.includes(name) &&
             !IGNORED_PREFIXES.some(prefix => name.startsWith(prefix));
    })
    .map(l => l.name)
    .join(', ');
}

function getPostUrl(post) {
  return `?post=${post.number}`;
}

function updateSEO(post) {
  const title = post ? `${post.title} - Duckers Blog` : 'Duckers Blog';
  const description = post 
    ? post.body.substring(0, 160).replace(/[#*`]/g, '').trim() + '...'
    : 'Thoughts and observations on software, technology, and everything in between.';
  const url = post ? `${BASE_URL}/?post=${post.number}` : BASE_URL;
  
  document.title = title;
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = description;
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = title;
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = description;
  
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = url;
  
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType) ogType.content = post ? 'article' : 'website';
  
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = url;
  
  if (post) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = PROFILE.avatar;
    
    let articlePublished = document.querySelector('meta[property="article:published_time"]');
    if (!articlePublished) {
      articlePublished = document.createElement('meta');
      articlePublished.setAttribute('property', 'article:published_time');
      document.head.appendChild(articlePublished);
    }
    articlePublished.content = post.created_at;
    
    let articleTags = document.querySelector('meta[property="article:tag"]');
    const tags = getPostTags(post.labels);
    if (tags) {
      if (!articleTags) {
        articleTags = document.createElement('meta');
        articleTags.setAttribute('property', 'article:tag');
        document.head.appendChild(articleTags);
      }
      articleTags.content = tags;
    }
  }
}

function renderUserSection() {
  const userSection = document.getElementById('user-section');
  const newPostBtn = document.getElementById('new-post-btn');
  
  if (state.user) {
    userSection.innerHTML = `
      <div class="user-info">
        <img src="${state.user.avatar_url}" alt="${state.user.login}">
        <span>${state.user.login}</span>
      </div>
    `;
    newPostBtn.style.display = 'inline-flex';
  } else {
    userSection.innerHTML = '';
    newPostBtn.style.display = 'none';
  }
}

function renderHome() {
  const container = document.getElementById('app');

  if (state.loading) {
    container.innerHTML = '<div class="loading">Loading...</div>';
    return;
  }

  if (state.error) {
    container.innerHTML = `<div class="error">${state.error}</div>`;
    return;
  }

  if (state.posts.length === 0) {
    container.innerHTML = '<div class="loading">No posts yet.</div>';
    return;
  }

  container.innerHTML = `
    <div class="posts">
      ${state.posts.map(post => `
        <article class="post">
          <h2><a href="${getPostUrl(post)}">${post.title}</a></h2>
          <div class="post-meta">${formatDate(post.created_at)}</div>
          <a href="${getPostUrl(post)}" class="read-btn">Read</a>
        </article>
      `).join('')}
    </div>
  `;
}

function renderPostPage(post) {
  const readingTime = calculateReadingTime(post.body);
  const tags = getPostTags(post.labels);
  const content = renderMarkdown(post.body);
  const issueUrl = `https://github.com/${OWNER}/${REPO}/issues/${post.number}`;

  return `
    <a href="/" class="back-link">Back</a>
    <article class="post-page">
      <h1>${post.title}</h1>
      <div class="post-meta">${formatDate(post.created_at)} · ${readingTime} min read · <a href="${issueUrl}" target="_blank" rel="noopener">View on GitHub</a></div>
      ${tags ? `<div class="tags">${tags.split(', ').map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
      <div class="post-content">${content}</div>
    </article>
    <section class="comments">
      <h2>Comments</h2>
      <div id="giscus-container"></div>
    </section>
  `;
}

function updateGiscus(post) {
  const container = document.getElementById('giscus-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const existingIframe = document.querySelector('.giscus-frame');
  if (existingIframe) existingIframe.remove();
  
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.setAttribute('data-repo', `${OWNER}/blog.duckers.dev`);
  script.setAttribute('data-repo-id', 'R_kgDOOnlYFA');
  script.setAttribute('data-category', 'Announcements');
  script.setAttribute('data-category-id', 'DIC_kwDOOnlYFM4Cj_Z8');
  script.setAttribute('data-mapping', 'specific');
  script.setAttribute('data-term', `issue-${post.number}`);
  script.setAttribute('data-strict', '0');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'bottom');
  script.setAttribute('data-theme', 'light');
  script.setAttribute('data-lang', 'en');
  script.setAttribute('crossorigin', 'anonymous');
  script.async = true;
  
  container.appendChild(script);
}

function handleRoute() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post');
  
  if (postId) {
    const post = state.posts.find(p => p.number === parseInt(postId));
    if (post) {
      updateSEO(post);
      document.getElementById('app').innerHTML = renderPostPage(post);
      window.scrollTo(0, 0);
      setTimeout(() => updateGiscus(post), 100);
      return;
    }
  }
  
  updateSEO(null);
  renderHome();
}

function render() {
  handleRoute();
}

async function fetchPosts() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=30&sort=created&direction=desc`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load posts (${response.status})`);
    }

    const issues = await response.json();
    state.posts = issues.filter(issue => !issue.pull_request);
    state.loading = false;
  } catch (error) {
    state.error = error.message;
    state.loading = false;
  }

  render();
}

function openEditorModal() {
  document.getElementById('editor-modal').classList.add('active');
  document.getElementById('post-title').value = '';
  document.getElementById('post-tags').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('editor-preview').style.display = 'none';
  document.getElementById('publish-btn').disabled = true;
}

function closeEditorModal() {
  document.getElementById('editor-modal').classList.remove('active');
}

function togglePreview() {
  const preview = document.getElementById('editor-preview');
  const previewBtn = document.getElementById('preview-btn');
  const content = document.getElementById('post-content').value;
  
  if (preview.style.display === 'none') {
    document.getElementById('preview-content').innerHTML = renderMarkdown(content);
    preview.style.display = 'block';
    previewBtn.textContent = 'Hide Preview';
  } else {
    preview.style.display = 'none';
    previewBtn.textContent = 'Preview';
  }
}

function updatePublishButton() {
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  document.getElementById('publish-btn').disabled = !title || !content;
}

async function startOAuthFlow() {
  const code = prompt('Go to https://github.com/device and enter this code:\n\nDUCKER-BLOG');
  
  if (!code) return;
  
  showToast('Authenticating...', 'default');
  
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo'
      })
    });
    
    const data = await response.json();
    
    if (data.device_code && data.user_code) {
      const userCode = prompt(`Visit https://github.com/device and enter this code:\n\n${data.user_code}\n\nThen click OK.`);
      
      if (!userCode) return;
      
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: data.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.access_token) {
        state.token = tokenData.access_token;
        localStorage.setItem('gh_token', tokenData.access_token);
        
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        state.user = await userResponse.json();
        localStorage.setItem('gh_user', JSON.stringify(state.user));
        renderUserSection();
        showToast(`Welcome, ${state.user.login}!`, 'success');
      } else {
        showToast('Authentication failed', 'error');
      }
    }
  } catch (error) {
    showToast('Authentication error', 'error');
  }
}

async function publishPost() {
  const title = document.getElementById('post-title').value.trim();
  const tagsInput = document.getElementById('post-tags').value.trim();
  const content = document.getElementById('post-content').value.trim();
  
  if (!title || !content) return;
  
  const publishBtn = document.getElementById('publish-btn');
  publishBtn.disabled = true;
  publishBtn.textContent = 'Publishing...';
  
  try {
    const labels = tagsInput 
      ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title,
        body: content,
        labels
      })
    });
    
    if (response.ok) {
      const issue = await response.json();
      closeEditorModal();
      showToast('Post published!', 'success');
      
      state.posts.unshift({...issue, pull_request: false});
      renderHome();
      
      setTimeout(() => {
        window.location.href = `?post=${issue.number}`;
      }, 500);
    } else {
      const error = await response.json();
      showToast(error.message || 'Failed to publish', 'error');
    }
  } catch (error) {
    showToast('Failed to publish post', 'error');
  }
  
  publishBtn.disabled = false;
  publishBtn.textContent = 'Publish';
}

function initEditor() {
  const modal = document.getElementById('editor-modal');
  const newPostBtn = document.getElementById('new-post-btn');
  const closeModalBtn = document.getElementById('close-modal');
  const previewBtn = document.getElementById('preview-btn');
  const publishBtn = document.getElementById('publish-btn');
  const titleInput = document.getElementById('post-title');
  const contentInput = document.getElementById('post-content');
  
  newPostBtn.addEventListener('click', () => {
    if (state.user) {
      openEditorModal();
    } else {
      startOAuthFlow();
    }
  });
  
  closeModalBtn.addEventListener('click', closeEditorModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEditorModal();
  });
  
  previewBtn.addEventListener('click', togglePreview);
  publishBtn.addEventListener('click', publishPost);
  
  titleInput.addEventListener('input', updatePublishButton);
  contentInput.addEventListener('input', updatePublishButton);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditorModal();
  });
}

function initAuth() {
  const savedToken = localStorage.getItem('gh_token');
  const savedUser = localStorage.getItem('gh_user');
  
  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    renderUserSection();
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

initProfile();
initAuth();
initEditor();
window.addEventListener('popstate', render);
render();
fetchPosts();
