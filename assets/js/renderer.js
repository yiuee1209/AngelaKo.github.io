let resumeData = null;
let currentLang = 'zh';

async function init() {
    resumeData = RESUME_DATA;
    render();
}

function render() {
    if (!resumeData) return;

    const langData = resumeData.basics[currentLang];
    
    // Sidebar basics
    document.getElementById('sidebar-content').innerHTML = `
        <h2>${langData.name}</h2>
        <div class="title">${langData.title}</div>
        <hr>
        <h3>${currentLang === 'zh' ? '聯絡資訊' : 'Contact'}</h3>
        <ul class="info-list" id="contact-info">
            <li><strong>${currentLang === 'zh' ? '電郵' : 'Email'}</strong> ${langData.email}</li>
            <li><strong>${currentLang === 'zh' ? '電話' : 'Phone'}</strong> ${langData.phone}</li>
            <li><strong>GitHub</strong> <a href="https://github.com/${langData.github}" target="_blank">${langData.github}</a></li>
        </ul>
        <h3 id="skills">${currentLang === 'zh' ? '專業技能' : 'Skills'}</h3>
        <p><strong>${currentLang === 'zh' ? '主要技能' : 'Primary'}:</strong> ${resumeData.skills.primary[currentLang].join(', ')}</p>
        <p><strong>${currentLang === 'zh' ? '次要技能' : 'Secondary'}:</strong> ${resumeData.skills.secondary[currentLang].join(', ')}</p>
    `;

    // Main Sections
    const main = document.getElementById('main-content');
    main.innerHTML = '';

    // Summary (Collapsible)
    main.appendChild(createCard(
        currentLang === 'zh' ? '自我介紹' : 'Summary', 
        `<div id="summary-content" class="toggle-content"><p>${langData.summary}</p></div>`, 
        'summary',
        true
    ));

    // Experience (Section-level Collapsible + Item-level Accordion)
    let expItemsHtml = '';
    resumeData.experience.forEach(exp => {
        expItemsHtml += `
            <div class="item">
                <div class="exp-header" onclick="toggleAccordion(this)">
                    <div>
                        <h3>${exp.company[currentLang]} / ${exp.role[currentLang]}</h3>
                        <div class="period">${exp.period[currentLang]}</div>
                    </div>
                    <span class="icon">▲</span>
                </div>
                <div class="toggle-content">
                    <ul>
                        ${exp.details[currentLang].map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    });
    main.appendChild(createCard(
        currentLang === 'zh' ? '工作經歷' : 'Experience', 
        `<div id="experience-content" class="toggle-content">${expItemsHtml}</div>`, 
        'experience',
        true
    ));

    // Education (Section-Level Toggle via Title)
    let eduDetailsHtml = '<div class="timeline">';
    resumeData.education.forEach(edu => {
        eduDetailsHtml += `
            <div class="timeline-item">
                <h3>${edu.school[currentLang]}</h3>
                <div class="year">${edu.year}</div>
                <p>${edu.degree[currentLang]}</p>
            </div>
        `;
    });
    eduDetailsHtml += '</div>';

    const eduCard = createCard(
        currentLang === 'zh' ? '學歷' : 'Education', 
        `<div id="education-content" class="toggle-content">${eduDetailsHtml}</div>`, 
        'education',
        true // isCollapsible
    );
    main.appendChild(eduCard);

    // Honors (Section-level Collapsible + Interactive Badges)
    let honorsItemsHtml = '<div class="honors-container">';
    resumeData.honors[currentLang].forEach((h, index) => {
        honorsItemsHtml += `
            <div class="honor-badge" onclick="toggleHonorDetail(event, ${index})">
                ${h.title}
                <div id="honor-detail-${index}" class="honor-detail-bubble">${h.details}</div>
            </div>`;
    });
    honorsItemsHtml += '</div>';
    
    main.appendChild(createCard(
        currentLang === 'zh' ? '相關榮譽' : 'Honors', 
        `<div id="honors-content" class="toggle-content">${honorsItemsHtml}</div>`, 
        'honors',
        true
    ));
}

function createCard(title, content, id, isCollapsible = false) {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.id = id;
    
    if (isCollapsible) {
        card.innerHTML = `
            <h2 class="section-title clickable-title expanded" onclick="toggleSection('${id}-content')">${title}</h2>
            <div>${content}</div>
        `;
    } else {
        card.innerHTML = `
            <h2 class="section-title">${title}</h2>
            <div>${content}</div>
        `;
    }
    return card;
}

function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    if (!content) return;
    const card = content.closest('.card');
    const title = card ? card.querySelector('.section-title') : null;
    
    content.classList.toggle('hidden');
    const isExpanded = !content.classList.contains('hidden');
    
    if (title) {
        title.classList.toggle('expanded', isExpanded);
    }
}

function toggleHonorDetail(event, index) {
    event.stopPropagation();
    // Close all other bubbles first
    document.querySelectorAll('.honor-detail-bubble').forEach((b, i) => {
        if (i !== index) b.classList.remove('active');
    });
    
    const bubble = document.getElementById(`honor-detail-${index}`);
    bubble.classList.toggle('active');
}

// Close honor bubbles when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.honor-detail-bubble').forEach(b => b.classList.remove('active'));
});

function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    document.querySelector('.lang-btn').textContent = currentLang === 'zh' ? 'English' : '中文';
    render();
}

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    content.classList.toggle('hidden');
    const isHidden = content.classList.contains('hidden');
    header.querySelector('span').textContent = isHidden ? '▼' : '▲';
}

document.addEventListener('DOMContentLoaded', init);
