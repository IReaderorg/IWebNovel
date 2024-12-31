const chapterContainer = document.getElementById('chapterContainer');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
const chaptersPerPage = 100;

async function fetchChapters(page) {
    try {
        const res = await fetch(`http://localhost:3000/api/chapters?page=${page}&limit=${chaptersPerPage}`);
        const data = await res.json();

        chapterContainer.innerHTML = data.chapters.map(chapter => `
            <div class="chapter-card">
                <h3>${chapter.book_title}</h3>
                <p><strong>Chapter:</strong> ${chapter.chapter_title}</p>
                <a href="${chapter.pastebin_url}" target="_blank">View Content</a>
            </div>
        `).join('');

        pageInfo.textContent = `Page ${page} of ${Math.ceil(data.total / chaptersPerPage)}`;
        prevPage.disabled = page === 1;
        nextPage.disabled = page >= Math.ceil(data.total / chaptersPerPage);
    } catch (err) {
        console.error('Error fetching chapters:', err);
        chapterContainer.innerHTML = "<p>Error loading chapters. Please try again.</p>";
    }
}

prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchChapters(currentPage);
    }
});

nextPage.addEventListener('click', () => {
    currentPage++;
    fetchChapters(currentPage);
});

document.addEventListener('DOMContentLoaded', () => fetchChapters(currentPage));
