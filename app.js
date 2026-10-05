"use strict";

/* =========================================================
   INJAZ1 — APP.JS
========================================================= */

(() => {

    const getLocalDate = () => {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    };

    const CONFIG = window.INJAZ_CONFIG || {
        appName: "Injaz1",
        version: "1.0.0",
        today: getLocalDate(),
        api: null
    };

    CONFIG.today = getLocalDate();

    /* =====================================================
       DATA
    ===================================================== */

    const STORAGE_KEY = "injaz1_data";

    const defaultData = {
        userName: "عمران",
        tasks: [],
        points: 0,
        streak: 0,
        bestStreak: 0,
        completedDates: [],
        notifications: [],
        settings: {
            notifications: true,
            sounds: true,
            motivation: true
        }
    };

    let data = loadData();

    let currentFilter = "all";
    let currentSection = "dashboard";

    let focusSeconds = 25 * 60;
    let focusTotalSeconds = 25 * 60;
    let focusInterval = null;
    let focusRunning = false;

    let notificationInterval = null;
    let toastTimeout = null;

    /* =====================================================
       MOTIVATION
    ===================================================== */

    const motivationMessages = [
        "ابدأ بخطوة واحدة، ودع الإنجاز يتبعها.",
        "لا تنتظر الحماس؛ ابدأ وسيأتي الحماس معك.",
        "مهمة واحدة الآن قد تصنع فرقًا كبيرًا في يومك.",
        "أكمل ما بدأت.",
        "الاستمرار أقوى من البداية القوية.",
        "لا تجعل مهمة صغيرة تؤجل يومًا كاملًا.",
        "أنجز الآن، واشكر نفسك لاحقًا.",
        "كل إنجاز كبير بدأ بخطوة.",
        "ركّز على المهمة التي أمامك فقط.",
        "اليوم فرصة جديدة لتتقدم.",
        "حين تبدأ، يصبح المستحيل أصغر.",
        "اجعل أفعالك اليوم تليق بأهدافك.",
        "خطوة أخرى… أنت تقترب.",
        "لا تجمع المهام؛ أنجزها واحدةً واحدة.",
        "الوقت الذي تستثمره الآن سيعود عليك إنجازًا."
    ];

    const dailyQuotes = [
        "الإنجاز لا يحتاج إلى يوم مثالي؛ يحتاج إلى بداية صادقة.",
        "لا تبحث عن الوقت المناسب، اصنعه.",
        "النجاح مجموعة من المحاولات التي لم تتوقف.",
        "ما تفعله كل يوم أهم مما تفعله مرة واحدة.",
        "ابدأ قبل أن تشعر أنك مستعد.",
        "قليل مستمر خير من كثير منقطع.",
        "رتّب يومك، ثم دع إنجازك يتحدث.",
        "لا تؤجل إنجاز اليوم إلى غدٍ.",
        "كل دقيقة تركّز فيها هي استثمار في مستقبلك.",
        "اجعل نهاية يومك أفضل من بدايتها."
    ];

    /* =====================================================
       CATEGORY DATA
    ===================================================== */

    const categories = {
        study: "📚 دراسة",
        quran: "📖 قرآن",
        archery: "🏹 رماية",
        reading: "📚 قراءة",
        programming: "💻 برمجة",
        content: "🎬 صناعة محتوى",
        personal: "◆ شخصي"
    };

    /* =====================================================
       DOM
    ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    /* =====================================================
       INIT
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);

    function init() {

        normalizeData();

        setupNavigation();
        setupTaskModal();
        setupTaskForm();
        setupFilters();
        setupNotifications();
        setupSettings();
        setupFocus();
        setupButtons();

        updateDate();
        updateMotivation();
        updateDashboard();
        renderTasks();
        updateStatistics();
        updateUserName();
        updateSettingsUI();
        updateFocusDisplay();
        renderNotifications();

        registerServiceWorker();

        startNotificationWatcher();

        document.addEventListener(
            "visibilitychange",
            () => {
                if (!document.hidden) {
                    checkDueTasks();
                    updateDate();
                    updateDashboard();
                }
            }
        );
    }

    /* =====================================================
       DATA
    ===================================================== */

    function loadData() {

        try {

            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return structuredClone(defaultData);
            }

            const parsed = JSON.parse(saved);

            return {
                ...structuredClone(defaultData),
                ...parsed,
                settings: {
                    ...defaultData.settings,
                    ...(parsed.settings || {})
                }
            };

        } catch (error) {

            console.error("Injaz1 data error:", error);

            return structuredClone(defaultData);
        }
    }

    function saveData() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );

        } catch (error) {

            console.error(
                "Unable to save Injaz1 data:",
                error
            );
        }
    }

    function normalizeData() {

        if (!Array.isArray(data.tasks)) {
            data.tasks = [];
        }

        if (!Array.isArray(data.notifications)) {
            data.notifications = [];
        }

        if (!Array.isArray(data.completedDates)) {
            data.completedDates = [];
        }

        data.tasks = data.tasks.map(task => ({
            id: task.id || createId(),
            title: String(task.title || ""),
            date: String(task.date || CONFIG.today),
            time: String(task.time || ""),
            category: task.category || "personal",
            priority: task.priority || "normal",
            duration: Number(task.duration) || 25,
            reminder: task.reminder !== false,
            completed: !!task.completed,
            createdAt: task.createdAt || new Date().toISOString(),
            completedAt: task.completedAt || null,
            notified: !!task.notified
        }));

        data.points = Number(data.points) || 0;
        data.streak = Number(data.streak) || 0;
        data.bestStreak = Number(data.bestStreak) || 0;

        if (!data.userName) {
            data.userName = "عمران";
        }

        saveData();
    }

    /* =====================================================
       NAVIGATION
    ===================================================== */

    function setupNavigation() {

        $$(".nav-item").forEach(button => {

            button.addEventListener("click", () => {

                const section = button.dataset.section;

                if (!section) return;

                navigateTo(section);
                closeMobileSidebar();
            });
        });

        $$("[data-section-target]").forEach(button => {

            button.addEventListener("click", () => {

                const section =
                    button.dataset.sectionTarget;

                if (section) {
                    navigateTo(section);
                }
            });
        });

        const mobileMenu = $("#mobileMenu");

        if (mobileMenu) {

            mobileMenu.addEventListener("click", () => {

                const sidebar = $("#sidebar");

                if (sidebar) {
                    sidebar.classList.toggle("open");
                }
            });
        }
    }

    function navigateTo(section) {

        currentSection = section;

        $$(".page-section").forEach(item => {
            item.classList.remove("active");
        });

        const target = $(`#${section}Section`);

        if (target) {
            target.classList.add("active");
        }

        $$(".nav-item").forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === section
            );
        });

        const titles = {
            dashboard: "لوحة الإنجاز",
            tasks: "مهامي",
            focus: "وضع التركيز",
            statistics: "إحصائيات الإنجاز",
            settings: "الإعدادات"
        };

        const pageTitle = $("#pageTitle");

        if (pageTitle) {
            pageTitle.textContent =
                titles[section] || "لوحة الإنجاز";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function closeMobileSidebar() {

        $("#sidebar")?.classList.remove("open");
    }

    /* =====================================================
       DATE
    ===================================================== */

    function updateDate() {

        const element = $("#currentDate");

        if (!element) return;

        element.textContent = new Intl.DateTimeFormat(
            "ar-EG",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(new Date());
    }

    /* =====================================================
       MOTIVATION
    ===================================================== */

    function updateMotivation() {

        const motivation = $("#motivationText");
        const quote = $("#dailyQuote");

        const day = new Date().getDate();

        if (motivation) {

            motivation.textContent =
                motivationMessages[
                    day % motivationMessages.length
                ];

            motivation.style.opacity =
                data.settings.motivation ? "1" : ".35";
        }

        if (quote) {

            quote.textContent =
                `«${dailyQuotes[
                    day % dailyQuotes.length
                ]}»`;
        }
    }

    /* =====================================================
       USER NAME
    ===================================================== */

    function updateUserName() {

        const name = data.userName || "عمران";

        const welcome = $("#welcomeTitle");

        if (welcome) {
            welcome.textContent =
                `أهلاً بك يا ${name} 👋`;
        }

        const profile = $(".profile-name");

        if (profile) {
            profile.textContent = name;
        }

        const input = $("#userNameInput");

        if (input && document.activeElement !== input) {
            input.value = name;
        }
    }

    /* =====================================================
       TASK MODAL
    ===================================================== */

    function setupTaskModal() {

        const modal = $("#taskModal");

        if (!modal) return;

        $("#addTaskButton")?.addEventListener(
            "click",
            openTaskModal
        );

        $("#addTaskButton2")?.addEventListener(
            "click",
            openTaskModal
        );

        $("#emptyAddTask")?.addEventListener(
            "click",
            openTaskModal
        );

        $("#emptyAddTask2")?.addEventListener(
            "click",
            openTaskModal
        );

        $("#closeTaskModal")?.addEventListener(
            "click",
            closeTaskModal
        );

        $("#cancelTask")?.addEventListener(
            "click",
            closeTaskModal
        );

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                closeTaskModal();
            }
        });

        document.addEventListener("keydown", event => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {
                closeTaskModal();
            }
        });
    }

    function openTaskModal() {

        const modal = $("#taskModal");

        if (!modal) return;

        const form = $("#taskForm");

        if (form) {
            form.reset();
        }

        const date = $("#taskDate");
        const reminder = $("#taskReminder");

        if (date) {
            date.value = CONFIG.today;
        }

        if (reminder) {
            reminder.checked = true;
        }

        modal.classList.add("active");

        document.body.classList.add("modal-open");

        setTimeout(() => {
            $("#taskTitle")?.focus();
        }, 100);
    }

    function closeTaskModal() {

        const modal = $("#taskModal");

        if (modal) {
            modal.classList.remove("active");
        }

        document.body.classList.remove("modal-open");
    }

    /* =====================================================
       TASK FORM
    ===================================================== */

    function setupTaskForm() {

        const form = $("#taskForm");

        if (!form) return;

        form.addEventListener("submit", async event => {

            event.preventDefault();

            const formData = new FormData(form);

            const title =
                String(formData.get("title") || "").trim();

            const date =
                String(formData.get("date") || "");

            const time =
                String(formData.get("time") || "");

            const category =
                String(
                    formData.get("category") ||
                    "personal"
                );

            const priority =
                String(
                    formData.get("priority") ||
                    "normal"
                );

            const duration =
                Number(
                    formData.get("duration") || 25
                );

            const reminder =
                formData.get("reminder") !== null;

            if (!title) {

                showToast(
                    "تنبيه",
                    "اكتب اسم المهمة أولًا.",
                    "⚠"
                );

                $("#taskTitle")?.focus();

                return;
            }

            if (!date || !time) {

                showToast(
                    "تنبيه",
                    "اختر تاريخ ووقت المهمة.",
                    "⚠"
                );

                return;
            }

            const task = {
                id: createId(),
                title,
                date,
                time,
                category,
                priority,
                duration,
                reminder,
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
                notified: false
            };

            data.tasks.push(task);

            saveData();

            renderTasks();
            updateDashboard();
            updateStatistics();

            closeTaskModal();

            showToast(
                "تمت إضافة المهمة",
                `${title} أضيفت إلى مهامك.`,
                "✓"
            );

            playSound(
                priority === "urgent"
                    ? "important"
                    : "reminder"
            );

            await syncTaskWithServer(
                "create",
                task
            );
        });
    }

    /* =====================================================
       TASK FILTERS
    ===================================================== */

    function setupFilters() {

        $$(".filter-button").forEach(button => {

            button.addEventListener("click", () => {

                currentFilter =
                    button.dataset.filter || "all";

                $$(".filter-button").forEach(item => {
                    item.classList.remove("active");
                });

                button.classList.add("active");

                renderTasks();
            });
        });
    }

    /* =====================================================
       TASK RENDERING
    ===================================================== */

    function renderTasks() {

        const upcoming = $("#upcomingTasks");
        const allTasks = $("#allTasksList");

        const filtered = getFilteredTasks();

        if (upcoming) {

            const upcomingTasks =
                getUpcomingTasks();

            if (!upcomingTasks.length) {

                upcoming.innerHTML =
                    emptyUpcomingHTML();

            } else {

                upcoming.innerHTML =
                    upcomingTasks
                        .slice(0, 5)
                        .map(taskHTML)
                        .join("");
            }
        }

        if (allTasks) {

            if (!filtered.length) {

                allTasks.innerHTML =
                    emptyTasksHTML();

            } else {

                allTasks.innerHTML =
                    filtered
                        .sort(sortTasks)
                        .map(taskHTML)
                        .join("");
            }
        }

        attachTaskEvents();
    }

    function getFilteredTasks() {

        switch (currentFilter) {

            case "pending":
                return data.tasks.filter(
                    task => !task.completed
                );

            case "completed":
                return data.tasks.filter(
                    task => task.completed
                );

            case "important":
                return data.tasks.filter(
                    task =>
                        task.priority === "important" ||
                        task.priority === "urgent"
                );

            default:
                return [...data.tasks];
        }
    }

    function getUpcomingTasks() {

        const today = CONFIG.today;

        return data.tasks
            .filter(task =>
                !task.completed &&
                task.date >= today
            )
            .sort(sortTasks);
    }

    function sortTasks(a, b) {

        const dateA =
            `${a.date} ${a.time || "23:59"}`;

        const dateB =
            `${b.date} ${b.time || "23:59"}`;

        return dateA.localeCompare(dateB);
    }

    function taskHTML(task) {

        const priorityText = {
            normal: "عادية",
            important: "مهمة",
            urgent: "عاجلة"
        };

        const category =
            categories[task.category] ||
            "◆ شخصي";

        const priority =
            priorityText[task.priority] ||
            "عادية";

        const completedClass =
            task.completed ? "completed" : "";

        return `
            <article
                class="task-item ${completedClass}"
                data-task-id="${escapeHTML(task.id)}"
            >

                <button
                    class="task-check"
                    data-action="complete"
                    aria-label="${
                        task.completed
                            ? "المهمة مكتملة"
                            : "إكمال المهمة"
                    }"
                    aria-pressed="${
                        task.completed
                    }"
                >
                    ${task.completed ? "✓" : ""}
                </button>

                <div class="task-main">

                    <div class="task-title">
                        ${escapeHTML(task.title)}
                    </div>

                    <div class="task-meta">

                        <span class="task-category">
                            ${escapeHTML(category)}
                        </span>

                        <span class="task-time">
                            ◷ ${formatTaskDate(task.date)}
                            ${
                                task.time
                                    ? ` · ${escapeHTML(task.time)}`
                                    : ""
                            }
                        </span>

                        <span
                            class="task-priority priority-${escapeHTML(
                                task.priority
                            )}"
                        >
                            ${escapeHTML(priority)}
                        </span>

                    </div>

                </div>

                <div class="task-actions">

                    ${
                        !task.completed
                            ? `
                                <button
                                    class="task-action"
                                    data-action="focus"
                                    title="تركيز"
                                    aria-label="بدء التركيز"
                                >
                                    ◷
                                </button>
                            `
                            : ""
                    }

                    <button
                        class="task-action delete"
                        data-action="delete"
                        title="حذف"
                        aria-label="حذف المهمة"
                    >
                        ×
                    </button>

                </div>

            </article>
        `;
    }

    function emptyUpcomingHTML() {

        return `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h4>لا توجد مهام قادمة</h4>
                <p>أضف مهمة جديدة وابدأ الإنجاز.</p>

                <button
                    class="secondary-button"
                    id="emptyAddTask"
                >
                    إضافة مهمة
                </button>
            </div>
        `;
    }

    function emptyTasksHTML() {

        return `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h4>لا توجد مهام</h4>
                <p>أضف مهمة جديدة للبدء.</p>

                <button
                    class="secondary-button"
                    id="emptyAddTask2"
                >
                    إضافة مهمة
                </button>
            </div>
        `;
    }

    function attachTaskEvents() {

        $$(".task-item").forEach(item => {

            const id = item.dataset.taskId;

            item.querySelector(
                '[data-action="complete"]'
            )?.addEventListener(
                "click",
                () => completeTask(id)
            );

            item.querySelector(
                '[data-action="delete"]'
            )?.addEventListener(
                "click",
                () => deleteTask(id)
            );

            item.querySelector(
                '[data-action="focus"]'
            )?.addEventListener(
                "click",
                () => startFocusForTask(id)
            );
        });

        $("#emptyAddTask")?.addEventListener(
            "click",
            openTaskModal
        );

        $("#emptyAddTask2")?.addEventListener(
            "click",
            openTaskModal
        );
    }

    /* =====================================================
       COMPLETE TASK
    ===================================================== */

    async function completeTask(id) {

        const task = data.tasks.find(
            item => item.id === id
        );

        if (!task || task.completed) return;

        task.completed = true;
        task.completedAt =
            new Date().toISOString();

        const points =
            getTaskPoints(task);

        data.points += points;

        updateStreak();

        saveData();

        renderTasks();
        updateDashboard();
        updateStatistics();

        showToast(
            "أحسنت! 🎉",
            `أنجزت "${task.title}" وحصلت على +${points} نقطة.`,
            "✓"
        );

        playSound("success");

        await syncTaskWithServer(
            "complete",
            task
        );
    }

    function getTaskPoints(task) {

        if (task.priority === "urgent") {
            return 30;
        }

        if (task.priority === "important") {
            return 20;
        }

        return 10;
    }

    /* =====================================================
       DELETE TASK
    ===================================================== */

    async function deleteTask(id) {

        const index =
            data.tasks.findIndex(
                task => task.id === id
            );

        if (index === -1) return;

        const task = data.tasks[index];

        const confirmed =
            window.confirm(
                `هل تريد حذف المهمة "${task.title}"؟`
            );

        if (!confirmed) return;

        if (task.completed) {

            data.points = Math.max(
                0,
                data.points -
                getTaskPoints(task)
            );
        }

        data.tasks.splice(index, 1);

        saveData();

        renderTasks();
        updateDashboard();
        updateStatistics();

        showToast(
            "تم حذف المهمة",
            "تم حذف المهمة بنجاح.",
            "×"
        );

        await syncTaskWithServer(
            "delete",
            { id }
        );
    }

    /* =====================================================
       DASHBOARD
    ===================================================== */

    function updateDashboard() {

        const todayTasks =
            data.tasks.filter(
                task => task.date === CONFIG.today
            );

        const completedToday =
            todayTasks.filter(
                task => task.completed
            );

        const total =
            todayTasks.length;

        const completed =
            completedToday.length;

        const percent =
            total > 0
                ? Math.round(
                    (completed / total) * 100
                )
                : 0;

        setText(
            "#todayTasksCount",
            total
        );

        setText(
            "#completedTasksCount",
            completed
        );

        setText(
            "#pointsCount",
            data.points
        );

        setText(
            "#streakCount",
            data.streak
        );

        setText(
            "#sidebarStreak",
            data.streak
        );

        setText(
            "#progressPercent",
            `${percent}%`
        );

        setText(
            "#progressText",
            `${completed} من ${total} مهام مكتملة`
        );

        const remaining =
            Math.max(
                total - completed,
                0
            );

        setText(
            "#remainingText",
            remaining
                ? `متبقي ${remaining}`
                : total
                    ? "اكتمل اليوم 🎉"
                    : "ابدأ الآن"
        );

        const bar =
            $("#progressBar");

        if (bar) {
            bar.style.width =
                `${percent}%`;
        }

        const title =
            $("#progressTitle");

        if (title) {

            if (
                percent === 100 &&
                total > 0
            ) {

                title.textContent =
                    "أنجزت يومك بالكامل! 🔥";

            } else if (percent >= 75) {

                title.textContent =
                    "اقتربت من إكمال يومك!";

            } else if (percent >= 40) {

                title.textContent =
                    "استمر، أنت في الطريق الصحيح.";

            } else {

                title.textContent =
                    "أكمل يومك بقوة";
            }
        }
    }

    /* =====================================================
       STATISTICS
    ===================================================== */

    function updateStatistics() {

        const total =
            data.tasks.length;

        const completed =
            data.tasks.filter(
                task => task.completed
            ).length;

        setText(
            "#totalTasksStat",
            total
        );

        setText(
            "#completedStat",
            completed
        );

        setText(
            "#pointsStat",
            data.points
        );

        setText(
            "#bestStreakStat",
            data.bestStreak
        );
    }

    /* =====================================================
       STREAK
    ===================================================== */

    function updateStreak() {

        const today =
            CONFIG.today;

        if (
            !data.completedDates.includes(today)
        ) {
            data.completedDates.push(today);
        }

        const dates =
            [...new Set(data.completedDates)]
                .sort()
                .reverse();

        let streak = 0;

        let cursor =
            new Date(
                `${today}T00:00:00`
            );

        for (const dateString of dates) {

            const current =
                formatDateForStorage(
                    cursor
                );

            if (dateString === current) {

                streak++;

                cursor.setDate(
                    cursor.getDate() - 1
                );

            } else if (
                dateString < current
            ) {

                break;
            }
        }

        data.streak = streak;

        data.bestStreak =
            Math.max(
                data.bestStreak,
                data.streak
            );
    }

    function formatDateForStorage(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    /* =====================================================
       FOCUS MODE
    ===================================================== */

    function setupFocus() {

        $("#focusStart")?.addEventListener(
            "click",
            toggleFocus
        );

        $("#focusReset")?.addEventListener(
            "click",
            resetFocus
        );
    }

    function startFocusForTask(id) {

        const task =
            data.tasks.find(
                item => item.id === id
            );

        if (!task) return;

        navigateTo("focus");

        const minutes =
            Math.max(
                Number(task.duration) || 25,
                1
            );

        focusTotalSeconds =
            minutes * 60;

        focusSeconds =
            focusTotalSeconds;

        focusRunning = false;

        clearInterval(
            focusInterval
        );

        setText(
            "#focusTaskName",
            task.title
        );

        setText(
            "#focusStatus",
            "جاهز للبدء"
        );

        updateFocusDisplay();

        const button =
            $("#focusStart");

        if (button) {
            button.textContent =
                "بدء التركيز";
        }
    }

    function toggleFocus() {

        if (focusRunning) {
            pauseFocus();
        } else {
            startFocus();
        }
    }

    function startFocus() {

        if (focusSeconds <= 0) {
            resetFocus();
        }

        focusRunning = true;

        setText(
            "#focusStatus",
            "أنت في وضع التركيز"
        );

        const button =
            $("#focusStart");

        if (button) {
            button.textContent =
                "إيقاف مؤقت";
        }

        playSound("reminder");

        clearInterval(
            focusInterval
        );

        focusInterval =
            setInterval(() => {

                focusSeconds--;

                updateFocusDisplay();

                if (
                    focusSeconds <= 0
                ) {
                    finishFocus();
                }

            }, 1000);
    }

    function pauseFocus() {

        focusRunning = false;

        clearInterval(
            focusInterval
        );

        setText(
            "#focusStatus",
            "تم إيقاف التركيز مؤقتًا"
        );

        const button =
            $("#focusStart");

        if (button) {
            button.textContent =
                "متابعة";
        }
    }

    function resetFocus() {

        focusRunning = false;

        clearInterval(
            focusInterval
        );

        focusSeconds =
            focusTotalSeconds;

        setText(
            "#focusStatus",
            "جاهز للبدء"
        );

        const button =
            $("#focusStart");

        if (button) {
            button.textContent =
                "بدء التركيز";
        }

        updateFocusDisplay();
    }

    function finishFocus() {

        focusRunning = false;

        clearInterval(
            focusInterval
        );

        focusSeconds = 0;

        updateFocusDisplay();

        setText(
            "#focusStatus",
            "اكتمل وقت التركيز! 🎉"
        );

        const button =
            $("#focusStart");

        if (button) {
            button.textContent =
                "بدء من جديد";
        }

        playSound("success");

        showToast(
            "انتهت جلسة التركيز",
            "أحسنت! خذ لحظة ثم واصل إنجازك.",
            "★"
        );
    }

    function updateFocusDisplay() {

        const timer =
            $("#focusTimer");

        if (!timer) return;

        const safeSeconds =
            Math.max(
                Number(focusSeconds) || 0,
                0
            );

        const minutes =
            Math.floor(
                safeSeconds / 60
            );

        const seconds =
            safeSeconds % 60;

        timer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        const progress =
            focusTotalSeconds > 0
                ? (
                    (
                        focusTotalSeconds -
                        safeSeconds
                    ) /
                    focusTotalSeconds
                ) * 100
                : 0;

        const bar =
            $("#focusProgressBar");

        if (bar) {
            bar.style.width =
                `${Math.min(
                    Math.max(progress, 0),
                    100
                )}%`;
        }
    }

    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function setupNotifications() {

        $("#notificationButton")?.addEventListener(
            "click",
            toggleNotificationPanel
        );

        $("#closeNotificationPanel")?.addEventListener(
            "click",
            closeNotificationPanel
        );

        document.addEventListener(
            "click",
            event => {

                const panel =
                    $("#notificationPanel");

                const button =
                    $("#notificationButton");

                if (!panel || !button) {
                    return;
                }

                if (
                    panel.classList.contains("active") &&
                    !panel.contains(event.target) &&
                    !button.contains(event.target)
                ) {
                    closeNotificationPanel();
                }
            }
        );
    }

    function toggleNotificationPanel(event) {

        event.stopPropagation();

        const panel =
            $("#notificationPanel");

        if (!panel) return;

        panel.classList.toggle("active");

        renderNotifications();
    }

    function closeNotificationPanel() {

        $("#notificationPanel")
            ?.classList.remove("active");
    }

    function renderNotifications() {

        const list =
            $("#notificationList");

        const count =
            $("#notificationCount");

        if (!list) return;

        const notifications =
            data.notifications
                .slice()
                .reverse()
                .slice(0, 30);

        if (count) {
            count.textContent =
                notifications.length;
        }

        if (!notifications.length) {

            list.innerHTML = `
                <div class="notification-empty">
                    لا توجد تنبيهات حاليًا.
                </div>
            `;

            return;
        }

        list.innerHTML =
            notifications
                .map(
                    notification => `
                        <div class="notification-item">

                            <div class="notification-item-icon">
                                ${escapeHTML(
                                    notification.icon ||
                                    "🔔"
                                )}
                            </div>

                            <div class="notification-item-content">

                                <strong>
                                    ${escapeHTML(
                                        notification.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        notification.message
                                    )}
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("");
    }

    function startNotificationWatcher() {

        checkDueTasks();

        clearInterval(
            notificationInterval
        );

        notificationInterval =
            setInterval(
                checkDueTasks,
                15000
            );
    }

    function checkDueTasks() {

        if (!data.settings.notifications) {
            return;
        }

        const now = new Date();

        const currentDate =
            formatDateForStorage(now);

        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

        let changed = false;

        data.tasks.forEach(task => {

            if (
                task.completed ||
                !task.reminder ||
                task.notified ||
                task.date !== currentDate ||
                !task.time
            ) {
                return;
            }

            const parts =
                task.time.split(":");

            if (parts.length < 2) {
                return;
            }

            const hours =
                Number(parts[0]);

            const minutes =
                Number(parts[1]);

            if (
                Number.isNaN(hours) ||
                Number.isNaN(minutes)
            ) {
                return;
            }

            const taskMinutes =
                hours * 60 + minutes;

            if (
                currentMinutes >= taskMinutes
            ) {

                task.notified = true;

                changed = true;

                triggerTaskNotification(task);
            }
        });

        if (changed) {
            saveData();
        }
    }

    function triggerTaskNotification(task) {

        const important =
            task.priority === "important" ||
            task.priority === "urgent";

        const message =
            important
                ? `🔥 حان وقت المهمة المهمة: ${task.title}`
                : `⏰ حان وقت إنجاز: ${task.title}`;

        const motivation =
            important
                ? "ركّز، هذه المهمة تستحق اهتمامك الآن."
                : getRandomMotivation();

        addNotification(
            important
                ? "مهمة مهمة الآن"
                : "حان وقت المهمة",
            `${message} — ${motivation}`,
            important ? "🔥" : "🔔"
        );

        showToast(
            important
                ? "🔥 مهمة مهمة الآن"
                : "🔔 حان وقت المهمة",
            `${task.title} — ${motivation}`,
            important ? "🔥" : "🔔"
        );

        playSound(
            important
                ? "important"
                : "reminder"
        );

        sendBrowserNotification(
            important
                ? "🔥 مهمة مهمة الآن"
                : "🔔 حان وقت المهمة",
            `${task.title}\n${motivation}`
        );
    }

    function addNotification(
        title,
        message,
        icon = "🔔"
    ) {

        data.notifications.push({
            id: createId(),
            title,
            message,
            icon,
            createdAt:
                new Date().toISOString()
        });

        if (
            data.notifications.length > 100
        ) {

            data.notifications =
                data.notifications.slice(-100);
        }

        saveData();

        renderNotifications();

        $("#notificationDot")
            ?.classList.remove("hidden");
    }

    async function requestNotificationPermission() {

        if (
            !("Notification" in window) ||
            !data.settings.notifications
        ) {
            return false;
        }

        if (
            Notification.permission === "granted"
        ) {
            return true;
        }

        if (
            Notification.permission === "denied"
        ) {
            showToast(
                "التنبيهات محظورة",
                "اسمح للتطبيق بالتنبيهات من إعدادات المتصفح.",
                "🔕"
            );

            return false;
        }

        try {

            const permission =
                await Notification.requestPermission();

            if (
                permission === "granted"
            ) {
                return true;
            }

        } catch (error) {

            console.warn(
                "Notification permission:",
                error
            );
        }

        return false;
    }

    async function sendBrowserNotification(
        title,
        body
    ) {

        if (
            !("Notification" in window) ||
            Notification.permission !== "granted"
        ) {
            return;
        }

        const options = {
            body,
            icon: "./icons/icon-192.jpeg",
            badge: "./icons/icon-192.jpeg",
            tag: `injaz1-${Date.now()}`,
            renotify: true,
            data: {
                url: "./index.html",
                section: "tasks"
            }
        };

        try {

            if (
                "serviceWorker" in navigator
            ) {

                const registration =
                    await navigator.serviceWorker.ready;

                if (
                    registration.showNotification
                ) {

                    await registration.showNotification(
                        title,
                        options
                    );

                    return;
                }
            }

            const notification =
                new Notification(
                    title,
                    options
                );

            notification.onclick = () => {

                window.focus();

                navigateTo("tasks");

                notification.close();
            };

        } catch (error) {

            console.warn(
                "Browser notification:",
                error
            );
        }
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    function setupSettings() {

        const nameInput =
            $("#userNameInput");

        nameInput?.addEventListener(
            "input",
            event => {

                const name =
                    event.target.value.trim();

                data.userName =
                    name || "عمران";

                saveData();

                updateUserName();
            }
        );

        const notificationToggle =
            $("#notificationsToggle");

        notificationToggle?.addEventListener(
            "change",
            async event => {

                data.settings.notifications =
                    event.target.checked;

                saveData();

                if (
                    event.target.checked
                ) {

                    const granted =
                        await requestNotificationPermission();

                    if (!granted) {

                        event.target.checked =
                            false;

                        data.settings.notifications =
                            false;

                        saveData();

                        updateSettingsUI();

                        return;
                    }

                    showToast(
                        "تم تفعيل التنبيهات",
                        "سيحاول Injaz1 تنبيهك عند حلول وقت المهمة.",
                        "🔔"
                    );

                } else {

                    showToast(
                        "تم إيقاف التنبيهات",
                        "لن يتم تشغيل تنبيهات المهام.",
                        "🔕"
                    );
                }
            }
        );

        const soundsToggle =
            $("#soundsToggle");

        soundsToggle?.addEventListener(
            "change",
            event => {

                data.settings.sounds =
                    event.target.checked;

                saveData();

                if (
                    event.target.checked
                ) {

                    playSound("success");

                    showToast(
                        "تم تفعيل النغمات",
                        "ستعمل أصوات Injaz1 عند الحاجة.",
                        "🔊"
                    );

                } else {

                    showToast(
                        "تم إيقاف النغمات",
                        "لن يتم تشغيل أصوات Injaz1.",
                        "🔇"
                    );
                }
            }
        );

        const motivationToggle =
            $("#motivationToggle");

        motivationToggle?.addEventListener(
            "change",
            event => {

                data.settings.motivation =
                    event.target.checked;

                saveData();

                const text =
                    $("#motivationText");

                if (text) {

                    text.style.opacity =
                        event.target.checked
                            ? "1"
                            : ".35";
                }
            }
        );

        updateSettingsUI();
    }

    function updateSettingsUI() {

        const notificationToggle =
            $("#notificationsToggle");

        const soundsToggle =
            $("#soundsToggle");

        const motivationToggle =
            $("#motivationToggle");

        if (notificationToggle) {

            notificationToggle.checked =
                !!data.settings.notifications;
        }

        if (soundsToggle) {

            soundsToggle.checked =
                !!data.settings.sounds;
        }

        if (motivationToggle) {

            motivationToggle.checked =
                !!data.settings.motivation;
        }
    }

    /* =====================================================
       SOUNDS
    ===================================================== */

    function playSound(type) {

        if (!data.settings.sounds) {
            return;
        }

        const ids = {
            reminder: "reminderSound",
            important: "importantSound",
            success: "successSound"
        };

        const audio =
            document.getElementById(
                ids[type]
            );

        if (!audio) return;

        try {

            audio.currentTime = 0;

            const promise =
                audio.play();

            if (
                promise &&
                typeof promise.catch === "function"
            ) {
                promise.catch(() => {});
            }

        } catch (error) {

            console.warn(
                "Audio error:",
                error
            );
        }
    }

    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        title,
        message,
        icon = "✓"
    ) {

        const toast =
            $("#toast");

        if (!toast) return;

        setText(
            "#toastTitle",
            title
        );

        setText(
            "#toastMessage",
            message
        );

        setText(
            "#toastIcon",
            icon
        );

        toast.classList.remove("active");

        requestAnimationFrame(() => {
            toast.classList.add("active");
        });

        clearTimeout(toastTimeout);

        toastTimeout =
            setTimeout(() => {

                toast.classList.remove(
                    "active"
                );

            }, 5000);
    }

    function setupButtons() {

        $("#closeToast")?.addEventListener(
            "click",
            () => {

                $("#toast")
                    ?.classList.remove("active");

                clearTimeout(toastTimeout);
            }
        );

        $("#profileButton")?.addEventListener(
            "click",
            () => {
                navigateTo("settings");
            }
        );
    }

    /* =====================================================
       SERVER SYNC
    ===================================================== */

    async function syncTaskWithServer(
        action,
        task
    ) {

        if (!CONFIG.api) return;

        try {

            const response =
                await fetch(
                    CONFIG.api,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            action,
                            task
                        })
                    }
                );

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const result =
                await response.json();

            if (
                result &&
                result.success === false
            ) {

                console.warn(
                    "Injaz1 API:",
                    result.message
                );
            }

        } catch (error) {

            console.warn(
                "Server sync unavailable:",
                error
            );
        }
    }

    /* =====================================================
       SERVICE WORKER
    ===================================================== */

    async function registerServiceWorker() {

        if (
            !("serviceWorker" in navigator)
        ) {
            return;
        }

        if (
            location.protocol !== "https:" &&
            location.hostname !== "localhost" &&
            location.hostname !== "127.0.0.1"
        ) {
            return;
        }

        try {

            await navigator.serviceWorker.register(
                "./sw.js",
                {
                    scope: "./"
                }
            );

        } catch (error) {

            console.warn(
                "Service Worker registration failed:",
                error
            );
        }
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function createId() {

        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );
    }

    function getRandomMotivation() {

        return motivationMessages[
            Math.floor(
                Math.random() *
                motivationMessages.length
            )
        ];
    }

    function formatTaskDate(dateString) {

        if (!dateString) {
            return "";
        }

        if (
            dateString === CONFIG.today
        ) {
            return "اليوم";
        }

        const date =
            new Date(
                `${dateString}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return dateString;
        }

        return new Intl.DateTimeFormat(
            "ar-EG",
            {
                day: "numeric",
                month: "short"
            }
        ).format(date);
    }

    function setText(
        selector,
        value
    ) {

        const element =
            $(selector);

        if (element) {
            element.textContent =
                String(value);
        }
    }

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

})();