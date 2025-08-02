// Initialiser Supabase
const supabaseUrl = 'https://supabase.com/dashboard/project/vvynnacemlmlezoktmpq/settings/api-keys'; // Remplace par ton URL Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eW5uYWNlbWxtbGV6b2t0bXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjAyMjksImV4cCI6MjA2OTczNjIyOX0.qnk7lKQx_HoB0b0NZ33lQnua0ppvQUT9U0r9Vd35UFc'; // Remplace par ta clé anon publique
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Authentification avec nom, téléphone et code secret
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const postSection = document.getElementById('post-section');
const validSecret = "0000"; // Remplace par ton code secret sécurisé

authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const secret = document.getElementById('secret').value.trim();

    if (secret === validSecret) {
        localStorage.setItem('userName', name);
        localStorage.setItem('userPhone', phone);
        authMessage.textContent = `Bienvenue, ${name} !`;
        authForm.classList.add('hidden');
        postSection.classList.remove('hidden');
        displayPosts();
    } else {
        authMessage.textContent = 'Code secret incorrect !';
    }
});

// Afficher les publications
async function displayPosts() {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '';
    const { data: posts, error } = await supabase.from('posts').select('*').order('timestamp', { ascending: false });
    if (error) console.error('Erreur chargement posts:', error);
    else {
        posts.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            postDiv.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-800">${post.title}</h2>
                <p class="text-gray-600 mb-2">Publié par ${post.author} le ${new Date(post.timestamp).toLocaleString('fr-FR')}</p>
                <p class="text-gray-600 mb-4">${post.content}</p>
                ${post.image ? `<img src="${post.image}" alt="${post.title}" class="max-w-full h-auto mt-2">` : ''}
                <div class="comments mt-4">
                    <h3 class="text-lg font-medium text-gray-700">Commentaires</h3>
                    ${post.comments
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(comment => `<div class="comment">${comment.text} <small>(${new Date(comment.timestamp).toLocaleString('fr-FR')})</small></div>`)
                        .join('')}
                    <form class="comment-form mt-2" data-post-id="${post.id}">
                        <input type="text" name="comment" placeholder="Ajouter un commentaire" required class="w-full p-2 border rounded">
                        <button type="submit" class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mt-2">Commenter</button>
                    </form>
                </div>
            `;
            postsContainer.appendChild(postDiv);
        });
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', handleCommentSubmit);
        });
    }
}

// Gérer la soumission des publications
document.getElementById('post-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const userName = localStorage.getItem('userName');
    if (!userName) {
        alert('Veuillez vous connecter d\'abord !');
        return;
    }

    const formData = new FormData(this);
    const title = formData.get('title');
    const content = formData.get('content');
    const imageUrl = formData.get('image_url');
    const imageFile = formData.get('image');

    let image = imageUrl;
    if (imageFile && imageFile.size > 0) {
        const { data, error } = await supabase.storage.from('images').upload(`${Date.now()}_${imageFile.name}`, imageFile);
        if (error) console.error('Erreur upload image:', error);
        else image = `${supabaseUrl}/storage/v1/object/public/images/${data.path}`;
    }

    const { error } = await supabase.from('posts').insert({
        title,
        content,
        image,
        comments: [],
        timestamp: Date.now(),
        author: userName
    });
    if (error) console.error('Erreur sauvegarde post:', error);
    else {
        displayPosts();
        this.reset();

        // Envoyer à Web3Forms
        formData.append('author', userName);
        fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => console.log('Publication envoyée:', data))
            .catch(error => console.error('Erreur Web3Forms:', error));
    }
});

// Gérer la soumission des commentaires
function handleCommentSubmit(e) {
    e.preventDefault();
    const userName = localStorage.getItem('userName');
    if (!userName) {
        alert('Veuillez vous connecter d\'abord !');
        return;
    }

    const postId = e.target.dataset.postId;
    const commentInput = e.target.querySelector('input[name="comment"]');
    const comment = commentInput.value.trim();

    if (comment) {
        supabase.from('posts').update({
            comments: supabase.arrayAppend('comments', { text: `${userName}: ${comment}`, timestamp: Date.now() })
        }).eq('id', postId).then(() => {
            commentInput.value = '';
            displayPosts();

            const formData = new FormData();
            formData.append('access_key', '9eae8f19-3986-457e-991f-43c241c17b22');
            formData.append('subject', 'Nouveau commentaire');
            formData.append('post_id', postId);
            formData.append('comment', comment);
            formData.append('author', userName);
            fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => console.log('Commentaire envoyé:', data))
                .catch(error => console.error('Erreur Web3Forms:', error));
        }).catch(error => console.error('Erreur commentaire:', error));
    }
}

// Charger les publications au démarrage
displayPosts();