class HealthTracker {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.healthData = {
            steps: 0,
            distance: 0,
            caloriesBurned: 0,
            waterIntake: 0,
            caloriesConsumed: 0,
            activities: [],
            foods: [],
            stepsGoal: 10000,
            waterGoal: 2000,
            caloriesGoal: 2000
        };
        this.history = [];
        this.init();
    }

    init() {
        this.checkLogin();
        this.setupEventListeners();
    }

    checkLogin() {
        // Проверяем, есть ли сохраненный пользователь в localStorage
        // Если пользователь уже сохранен, автоматически загружаем его данные и переходим в приложение
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.loadUserData();
            if (this.currentUser.is_admin) {
                this.showAdminPanel();
            } else if (!this.userProfile) {
                this.showSurvey();
            } else {
                this.setupUI();
                this.updateUI();
            }
        } else {
            document.getElementById('login-modal').style.display = 'flex';
        }
    }

    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-btn').addEventListener('click', () => {
            this.handleRegister();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('survey-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processSurvey();
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.getAttribute('data-section');
                this.showSection(sectionId);
            });
        });

        document.getElementById('close-admin-btn').addEventListener('click', () => {
            document.getElementById('admin-modal').style.display = 'none';
            if (this.currentUser.is_admin) {
                document.getElementById('login-modal').style.display = 'flex';
                document.getElementById('app').style.display = 'none';
            } else {
                this.setupUI();
                this.updateUI();
            }
        });
    }

    logout() {
        // Очищаем сохраненного пользователя из localStorage, чтобы при следующем входе потребовался логин
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.userProfile = null;
        this.healthData = {
            steps: 0,
            distance: 0,
            caloriesBurned: 0,
            waterIntake: 0,
            caloriesConsumed: 0,
            activities: [],
            foods: [],
            stepsGoal: 10000,
            waterGoal: 2000,
            caloriesGoal: 2000
        };
        this.history = [];
        location.reload();
    }

    handleLogin() {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.login === login && u.password === password);

        if (user) {
            this.currentUser = user;
            // Сохраняем пользователя в localStorage, чтобы при следующем запуске не вводить логин и пароль
            localStorage.setItem('currentUser', JSON.stringify(user));
            document.getElementById('login-modal').style.display = 'none';
            this.loadUserData();
            if (user.is_admin) {
                this.showAdminPanel();
            } else if (!this.userProfile) {
                this.showSurvey();
            } else {
                this.setupUI();
                this.updateUI();
            }
        } else {
            alert('Неверный логин или пароль');
        }
    }

    handleRegister() {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;

        let users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.login === login)) {
            alert('Пользователь с таким логином уже существует');
            return;
        }

        const newUser = {
            id: users.length + 1,
            login,
            password,
            is_admin: login === 'admin' && password === 'admin' ? true : false
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        alert('Регистрация успешна! Теперь войдите.');
    }

    loadUserData() {
        const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        this.userProfile = profiles.find(p => p.user_id === this.currentUser.id);

        const today = new Date().toISOString().split('T')[0];
        const healthData = JSON.parse(localStorage.getItem('health_data') || '[]');
        const userData = healthData.find(d => d.user_id === this.currentUser.id && d.date === today);
        if (userData) {
            this.healthData = userData.data;
        }

        this.history = healthData.filter(d => d.user_id === this.currentUser.id);
    }

    saveUserData() {
        let profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        profiles = profiles.filter(p => p.user_id !== this.currentUser.id);
        profiles.push({ user_id: this.currentUser.id, ...this.userProfile });
        localStorage.setItem('profiles', JSON.stringify(profiles));

        const today = new Date().toISOString().split('T')[0];
        let healthData = JSON.parse(localStorage.getItem('health_data') || '[]');
        healthData = healthData.filter(d => d.user_id !== this.currentUser.id || d.date !== today);
        healthData.push({ user_id: this.currentUser.id, date: today, data: this.healthData });
        localStorage.setItem('health_data', JSON.stringify(healthData));

        this.history = healthData.filter(d => d.user_id === this.currentUser.id);
    }

    showSurvey() {
        document.getElementById('survey-modal').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    processSurvey() {
        const form = document.getElementById('survey-form');
        this.userProfile = {
            user_id: this.currentUser.id,
            gender: form.querySelector('#gender').value,
            age: parseInt(form.querySelector('#age').value),
            weight: parseInt(form.querySelector('#weight').value),
            height: parseInt(form.querySelector('#height').value),
            activityLevel: form.querySelector('#activity-level').value,
            goals: Array.from(form.querySelectorAll('input[name="goals"]:checked')).map(el => el.value)
        };

        this.generateRecommendations();
        this.saveUserData();

        document.getElementById('survey-modal').style.display = 'none';
        this.setupUI();
        this.updateUI();
    }

    generateRecommendations() {
        const hasWeightLoss = this.userProfile.goals.includes('weight-loss');
        const hasMuscleGain = this.userProfile.goals.includes('muscle-gain');
        this.userProfile.workoutPlan = {
            type: hasWeightLoss && !hasMuscleGain ? 'cardio' : 
                 hasMuscleGain && !hasWeightLoss ? 'strength' : 'mixed',
            frequency: hasWeightLoss && !hasMuscleGain ? '5-6 раз в неделю' : 
                     hasMuscleGain && !hasWeightLoss ? '4-5 раз в неделю' : '3-5 раз в неделю',
            duration: hasWeightLoss && !hasMuscleGain ? '30-45 минут' : 
                    hasMuscleGain && !hasWeightLoss ? '45-60 минут' : '30-60 минут',
            exercises: hasWeightLoss && !hasMuscleGain ? 
                      ['Бег', 'Плавание', 'Велосипед', 'Прыжки на скакалке', 'HIIT'] :
                     hasMuscleGain && !hasWeightLoss ? 
                      ['Приседания', 'Становая тяга', 'Жим лежа', 'Подтягивания', 'Отжимания'] :
                      ['Круговая тренировка', 'Йога', 'Плавание', 'Функциональный тренинг'],
            description: hasWeightLoss && !hasMuscleGain ? 'Кардио программа для эффективного сжигания жира' :
                        hasMuscleGain && !hasWeightLoss ? 'Силовая программа для набора мышечной массы' :
                        'Сбалансированная программа для общего развития'
        };

        const bmr = this.calculateBMR();
        const calories = Math.round(bmr * this.getActivityFactor());
        let dietType = 'balanced';
        let protein, fat, carbs;

        if (hasWeightLoss) {
            dietType = 'low-carb';
            protein = Math.round(this.userProfile.weight * 2.2);
            fat = Math.round(this.userProfile.weight * 0.8);
            carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);
        } else if (hasMuscleGain) {
            dietType = 'high-protein';
            protein = Math.round(this.userProfile.weight * 2.5);
            fat = Math.round(this.userProfile.weight * 1);
            carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);
        } else {
            protein = Math.round(this.userProfile.weight * 1.8);
            fat = Math.round(this.userProfile.weight * 0.7);
            carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);
        }

        this.userProfile.dietPlan = {
            dailyCalories: calories,
            macronutrients: { protein, fat, carbs },
            meals: this.generateMealPlan(dietType),
            dietType
        };

        this.healthData.stepsGoal = hasWeightLoss ? 15000 : 10000;
        this.healthData.waterGoal = Math.round(this.userProfile.weight * 35);
        this.healthData.caloriesGoal = calories;
    }

    calculateBMR() {
        if (this.userProfile.gender === 'male') {
            return 10 * this.userProfile.weight + 6.25 * this.userProfile.height - 5 * this.userProfile.age + 5;
        } else {
            return 10 * this.userProfile.weight + 6.25 * this.userProfile.height - 5 * this.userProfile.age - 161;
        }
    }

    getActivityFactor() {
        switch(this.userProfile.activityLevel) {
            case 'low': return 1.2;
            case 'medium': return 1.55;
            case 'high': return 1.9;
            default: return 1.375;
        }
    }

    generateMealPlan(type) {
        const meals = {};
        if (type === 'low-carb') {
            meals.breakfast = 'Омлет с овощами + авокадо';
            meals.lunch = 'Куриная грудка с брокколи и оливковым маслом';
            meals.dinner = 'Лосось со спаржей';
            meals.snacks = 'Орехи, сыр, йогурт';
        } else if (type === 'high-protein') {
            meals.breakfast = 'Творог с бананом и орехами';
            meals.lunch = 'Говядина с гречкой и овощами';
            meals.dinner = 'Тунец с киноа и зеленью';
            meals.snacks = 'Протеиновый коктейль, яйца';
        } else {
            meals.breakfast = 'Овсянка с ягодами и орехами';
            meals.lunch = 'Индейка с бурым рисом и салатом';
            meals.dinner = 'Запеченная рыба с овощами';
            meals.snacks = 'Фрукты, йогурт, цельнозерновые хлебцы';
        }
        return meals;
    }

    getExerciseIntensity(exerciseType) {
        const intensityMap = {
            'бег': 10,
            'плавание': 7,
            'велосипед': 8,
            'прыжки на скакалке': 12,
            'hiit': 15,
            'приседания': 5,
            'становая тяга': 6,
            'жим лежа': 5,
            'подтягивания': 5,
            'отжимания': 5,
            'круговая тренировка': 8,
            'йога': 3,
            'функциональный тренинг': 7
        };
        return intensityMap[exerciseType.toLowerCase()] || 5; // Значение по умолчанию 5 ккал/мин
    }

    setupUI() {
        document.getElementById('app').style.display = 'block';
        const greeting = this.currentUser.is_admin ? 
            'Добро пожаловать, администратор' :
            this.userProfile.gender === 'male' ? 
            `Добро пожаловать, мужчина ${this.userProfile.age} лет` :
            `Добро пожаловать, женщина ${this.userProfile.age} лет`;
        document.getElementById('user-greeting').textContent = greeting;
    }

    showSection(sectionId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-link[data-section="${sectionId}"]`).classList.add('active');
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        this.updateSectionContent(sectionId);
    }

    updateSectionContent(sectionId) {
        switch(sectionId) {
            case 'dashboard': this.updateDashboard(); break;
            case 'workouts': this.updateWorkouts(); break;
            case 'diet': this.updateDiet(); break;
            case 'progress': this.updateProgress(); break;
            case 'settings': this.updateSettings(); break;
        }
    }

    updateUI() {
        this.updateDashboard();
    }

    updateDashboard() {
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = `
            <div class="dashboard">
                <div class="card activity-card">
                    <h2><i class="fas fa-walking"></i> Активность</h2>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">${this.healthData.steps}</div>
                            <div class="stat-label">Шаги</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${(this.healthData.distance / 1000).toFixed(2)}</div>
                            <div class="stat-label">Км</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.healthData.caloriesBurned}</div>
                            <div class="stat-label">Ккал</div>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${Math.min(100, (this.healthData.steps / this.healthData.stepsGoal) * 100)}%"></div>
                        </div>
                        <div class="progress-text">Цель: ${this.healthData.stepsGoal} шагов</div>
                    </div>
                    <div class="form-group">
                        <input type="number" id="steps-input" placeholder="Введите шаги" min="0">
                        <button id="add-steps-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Добавить</button>
                    </div>
                    <div class="btn-group">
                        <button id="reset-steps-btn" class="btn btn-secondary"><i class="fas fa-redo"></i> Сбросить</button>
                    </div>
                </div>
                
                <div class="card water-card">
                    <h2><i class="fas fa-tint"></i> Вода</h2>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">${this.healthData.waterIntake}</div>
                            <div class="stat-label">Стаканы</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.healthData.waterIntake * 250}</div>
                            <div class="stat-label">Мл</div>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${Math.min(100, (this.healthData.waterIntake * 250 / this.healthData.waterGoal) * 100)}%"></div>
                        </div>
                        <div class="progress-text">Цель: ${this.healthData.waterGoal} мл</div>
                    </div>
                    <div class="form-group">
                        <input type="number" id="water-input" placeholder="Введите воду в мл" min="0">
                        <button id="add-water-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Добавить</button>
                    </div>
                    <button id="reset-water-btn" class="btn btn-secondary btn-block"><i class="fas fa-redo"></i> Сбросить воду</button>
                </div>
                
                <div class="card nutrition-card">
                    <h2><i class="fas fa-utensils"></i> Питание</h2>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">${this.healthData.caloriesConsumed}</div>
                            <div class="stat-label">Ккал</div>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${Math.min(100, (this.healthData.caloriesConsumed / this.healthData.caloriesGoal) * 100)}%"></div>
                        </div>
                        <div class="progress-text">Цель: ${this.healthData.caloriesGoal} ккал</div>
                    </div>
                    <div class="form-group">
                        <input type="number" id="calories-input" placeholder="Введите калории" min="0">
                        <button id="add-calories-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Добавить</button>
                    </div>
                    <button id="reset-calories-btn" class="btn btn-secondary btn-block"><i class="fas fa-redo"></i> Сбросить калории</button>
                </div>

                <div class="card exercise-card">
                    <h2><i class="fas fa-dumbbell"></i> Упражнения</h2>
                    <div class="exercise-list">
                        <ul class="activity-list">
                            ${this.healthData.activities.map(activity => `
                                <li class="activity-item" data-id="${activity.id}">
                                    <span class="activity-name"><i class="fas fa-running"></i> ${activity.type}</span>
                                    <span class="activity-duration">${activity.duration} мин</span>
                                    <span class="activity-calories">${activity.calories} ккал</span>
                                    <button class="btn btn-danger delete-exercise" data-id="${activity.id}"><i class="fas fa-trash"></i></button>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="form-group">
                        <input type="text" id="exercise-name-input" placeholder="Название упражнения">
                        <input type="number" id="exercise-duration-input" placeholder="Время (мин)" min="0">
                        <button id="add-exercise-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Добавить</button>
                    </div>
                    <button id="reset-exercises-btn" class="btn btn-secondary btn-block"><i class="fas fa-redo"></i> Сбросить упражнения</button>
                </div>
            </div>
        `;

        this.setupDashboardEventListeners();
    }

    setupDashboardEventListeners() {
        // Обработка добавления шагов
        document.getElementById('add-steps-btn').addEventListener('click', () => {
            const stepsInput = document.getElementById('steps-input');
            const stepsToAdd = parseInt(stepsInput.value) || 0;
            if (stepsToAdd > 0) {
                this.healthData.steps += stepsToAdd;
                this.healthData.distance += stepsToAdd * 0.762; // 1 шаг = 0.762 м
                this.healthData.caloriesBurned += Math.round(stepsToAdd * 0.04); // Примерный расчет
                this.saveUserData();
                this.updateDashboard();
            }
        });

        // Обработка сброса шагов
        document.getElementById('reset-steps-btn').addEventListener('click', () => {
            this.healthData.steps = 0;
            this.healthData.distance = 0;
            const stepsCalories = Math.round(this.healthData.steps * 0.04);
            this.healthData.caloriesBurned -= stepsCalories;
            if (this.healthData.caloriesBurned < 0) this.healthData.caloriesBurned = 0;
            this.saveUserData();
            this.updateDashboard();
        });

        // Обработка добавления воды
        document.getElementById('add-water-btn').addEventListener('click', () => {
            const waterInput = document.getElementById('water-input');
            const waterToAdd = parseInt(waterInput.value) || 0;
            if (waterToAdd > 0) {
                this.healthData.waterIntake += Math.floor(waterToAdd / 250); // 1 стакан = 250 мл
                this.saveUserData();
                this.updateDashboard();
            }
        });

        // Обработка сброса воды
        document.getElementById('reset-water-btn').addEventListener('click', () => {
            this.healthData.waterIntake = 0;
            this.saveUserData();
            this.updateDashboard();
        });

        // Обработка добавления калорий
        document.getElementById('add-calories-btn').addEventListener('click', () => {
            const caloriesInput = document.getElementById('calories-input');
            const caloriesToAdd = parseInt(caloriesInput.value) || 0;
            if (caloriesToAdd > 0) {
                this.healthData.caloriesConsumed += caloriesToAdd;
                this.saveUserData();
                this.updateDashboard();
            }
        });

        // Обработка сброса калорий
        document.getElementById('reset-calories-btn').addEventListener('click', () => {
            this.healthData.caloriesConsumed = 0;
            this.saveUserData();
            this.updateDashboard();
        });

        // Обработка добавления упражнения
        document.getElementById('add-exercise-btn').addEventListener('click', () => {
            const exerciseNameInput = document.getElementById('exercise-name-input');
            const exerciseDurationInput = document.getElementById('exercise-duration-input');
            const exerciseName = exerciseNameInput.value.trim();
            const exerciseDuration = parseInt(exerciseDurationInput.value) || 0;

            if (exerciseName && exerciseDuration > 0) {
                const intensity = this.getExerciseIntensity(exerciseName);
                const calories = Math.round(intensity * exerciseDuration);
                const newExercise = {
                    id: this.healthData.activities.length + 1,
                    type: exerciseName,
                    duration: exerciseDuration,
                    calories: calories
                };
                this.healthData.activities.push(newExercise);
                this.healthData.caloriesBurned += calories;
                this.saveUserData();
                this.updateDashboard();
            }
        });

        // Обработка сброса упражнений
        document.getElementById('reset-exercises-btn').addEventListener('click', () => {
            const totalExerciseCalories = this.healthData.activities.reduce((sum, activity) => sum + activity.calories, 0);
            this.healthData.caloriesBurned -= totalExerciseCalories;
            if (this.healthData.caloriesBurned < 0) this.healthData.caloriesBurned = 0;
            this.healthData.activities = [];
            this.saveUserData();
            this.updateDashboard();
        });

        // Обработка удаления упражнения
        document.querySelectorAll('.delete-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('button').getAttribute('data-id'));
                const activityIndex = this.healthData.activities.findIndex(act => act.id === id);
                if (activityIndex !== -1) {
                    const removedActivity = this.healthData.activities.splice(activityIndex, 1)[0];
                    this.healthData.caloriesBurned -= removedActivity.calories;
                    if (this.healthData.caloriesBurned < 0) this.healthData.caloriesBurned = 0;
                    this.saveUserData();
                    this.updateDashboard();
                }
            });
        });

        // Дополнительно: обработка события change для полей ввода
        document.getElementById('steps-input').addEventListener('change', () => {
            document.getElementById('add-steps-btn').click();
        });

        document.getElementById('water-input').addEventListener('change', () => {
            document.getElementById('add-water-btn').click();
        });

        document.getElementById('calories-input').addEventListener('change', () => {
            document.getElementById('add-calories-btn').click();
        });

        document.getElementById('exercise-name-input').addEventListener('change', () => {
            if (document.getElementById('exercise-duration-input').value) {
                document.getElementById('add-exercise-btn').click();
            }
        });

        document.getElementById('exercise-duration-input').addEventListener('change', () => {
            if (document.getElementById('exercise-name-input').value) {
                document.getElementById('add-exercise-btn').click();
            }
        });
    }

    updateWorkouts() {
        const workoutsSection = document.getElementById('workouts');
        const { workoutPlan } = this.userProfile;
        workoutsSection.innerHTML = `
            <div class="workout-plan">
                <h2><i class="fas fa-dumbbell"></i> Ваш план тренировок</h2>
                <div class="card">
                    <h3>${workoutPlan.description}</h3>
                    <div class="workout-stats">
                        <div class="stat-item">
                            <div class="stat-value">${workoutPlan.frequency}</div>
                            <div class="stat-label">Частота</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${workoutPlan.duration}</div>
                            <div class="stat-label">Длительность</div>
                        </div>
                    </div>
                    <h4><i class="fas fa-list-ol"></i> Рекомендуемые упражнения</h4>
                    <ul class="exercise-list">
                        ${workoutPlan.exercises.map(ex => `
                            <li class="exercise-item">
                                <i class="fas fa-check-circle"></i> ${ex}
                            </li>
                        `).join('')}
                    </ul>
                    <h4><i class="fas fa-history"></i> История тренировок</h4>
                    <ul class="activity-list">
                        ${this.healthData.activities.map(activity => `
                            <li class="activity-item">
                                <span class="activity-name">
                                    <i class="fas fa-running"></i> ${activity.type}
                                </span>
                                <span class="activity-duration">${activity.duration} мин</span>
                                <span class="activity-calories">${activity.calories} ккал</span>
                                <button class="btn btn-danger delete-activity" data-id="${activity.id}"><i class="fas fa-trash"></i></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
        document.querySelectorAll('.delete-activity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('button').getAttribute('data-id'));
                const activityIndex = this.healthData.activities.findIndex(act => act.id === id);
                if (activityIndex !== -1) {
                    const removedActivity = this.healthData.activities.splice(activityIndex, 1)[0];
                    this.healthData.caloriesBurned -= removedActivity.calories;
                    if (this.healthData.caloriesBurned < 0) this.healthData.caloriesBurned = 0;
                    this.saveUserData();
                    this.updateWorkouts();
                }
            });
        });
    }

    updateDiet() {
        const dietSection = document.getElementById('diet');
        const { dietPlan } = this.userProfile;
        dietSection.innerHTML = `
            <div class="diet-plan">
                <h2><i class="fas fa-utensils"></i> Ваш план питания</h2>
                <div class="card">
                    <h3>Рекомендуемая норма: ${dietPlan.dailyCalories} ккал/день</h3>
                    <div class="macronutrients">
                        <div class="stat-item">
                            <div class="stat-value">${dietPlan.macronutrients.protein}g</div>
                            <div class="stat-label">Белки</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${dietPlan.macronutrients.fat}g</div>
                            <div class="stat-label">Жиры</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${dietPlan.macronutrients.carbs}g</div>
                            <div class="stat-label">Углеводы</div>
                        </div>
                    </div>
                    <h4><i class="fas fa-calendar-day"></i> Примерный рацион</h4>
                    <div class="meal-plan">
                        <div class="meal-item">
                            <h5><i class="fas fa-sun"></i> Завтрак</h5>
                            <p>${dietPlan.meals.breakfast}</p>
                        </div>
                        <div class="meal-item">
                            <h5><i class="fas fa-sun"></i> Обед</h5>
                            <p>${dietPlan.meals.lunch}</p>
                        </div>
                        <div class="meal-item">
                            <h5><i class="fas fa-moon"></i> Ужин</h5>
                            <p>${dietPlan.meals.dinner}</p>
                        </div>
                        <div class="meal-item">
                            <h5><i class="fas fa-utensils"></i> Перекусы</h5>
                            <p>${dietPlan.meals.snacks}</p>
                        </div>
                    </div>
                    <h4><i class="fas fa-history"></i> Сегодня съедено</h4>
                    <ul class="food-list">
                        ${this.healthData.foods.map(food => `
                            <li class="food-item">
                                <span class="food-name"><i class="fas fa-utensils"></i> ${food.name}</span>
                                <span class="food-calories">${food.calories} ккал</span>
                                <button class="btn btn-danger delete-food" data-id="${food.id}"><i class="fas fa-trash"></i></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
        document.querySelectorAll('.delete-food').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('button').getAttribute('data-id'));
                const foodIndex = this.healthData.foods.findIndex(food => food.id === id);
                if (foodIndex !== -1) {
                    const removedFood = this.healthData.foods.splice(foodIndex, 1)[0];
                    this.healthData.caloriesConsumed -= removedFood.calories;
                    this.saveUserData();
                    this.updateDiet();
                }
            });
        });
    }

    updateProgress() {
        const progressSection = document.getElementById('progress');
        progressSection.innerHTML = `
            <div class="progress-charts">
                <h2>Ваш прогресс</h2>
                <div class="card">
                    <h3>Шаги за неделю</h3>
                    <div class="chart" id="steps-chart">
                        <canvas id="stepsChart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h3>Потребление воды</h3>
                    <div class="chart" id="water-chart">
                        <canvas id="waterChart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h3>Калории</h3>
                    <div class="chart" id="calories-chart">
                        <canvas id="caloriesChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        this.initCharts();
    }

    initCharts(history = this.history) {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }

        const stepsData = days.map(day => {
            const record = history.find(h => h.date === day);
            return record ? record.data.steps : 0;
        });
        const waterData = days.map(day => {
            const record = history.find(h => h.date === day);
            return record ? record.data.waterIntake * 250 : 0;
        });
        const caloriesConsumedData = days.map(day => {
            const record = history.find(h => h.date === day);
            return record ? record.data.caloriesConsumed : 0;
        });
        const caloriesBurnedData = days.map(day => {
            const record = history.find(h => h.date === day);
            return record ? record.data.caloriesBurned : 0;
        });

        new Chart(document.getElementById('stepsChart'), {
            type: 'bar',
            data: {
                labels: days.map(d => new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' })),
                datasets: [{
                    label: 'Шаги',
                    data: stepsData,
                    backgroundColor: 'rgba(0, 184, 148, 0.7)',
                    borderColor: 'rgba(0, 184, 148, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        new Chart(document.getElementById('waterChart'), {
            type: 'line',
            data: {
                labels: days.map(d => new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' })),
                datasets: [{
                    label: 'Вода (мл)',
                    data: waterData,
                    backgroundColor: 'rgba(9, 132, 227, 0.2)',
                    borderColor: 'rgba(9, 132, 227, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        new Chart(document.getElementById('caloriesChart'), {
            type: 'line',
            data: {
                labels: days.map(d => new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' })),
                datasets: [
                    {
                        label: 'Потреблено',
                        data: caloriesConsumedData,
                        backgroundColor: 'rgba(225, 112, 85, 0.2)',
                        borderColor: 'rgba(225, 112, 85, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Сожжено',
                        data: caloriesBurnedData,
                        backgroundColor: 'rgba(253, 121, 168, 0.2)',
                        borderColor: 'rgba(253, 121, 168, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    updateSettings() {
        const settingsSection = document.getElementById('settings');
        settingsSection.innerHTML = `
            <div class="settings">
                <h2><i class="fas fa-cog"></i> Настройки</h2>
                <div class="card">
                    <h3><i class="fas fa-user"></i> Профиль</h3>
                    <div class="profile-info">
                        <p><strong>Пол:</strong> ${this.userProfile.gender === 'male' ? 'Мужской' : 'Женский'}</p>
                        <p><strong>Возраст:</strong> ${this.userProfile.age}</p>
                        <p><strong>Вес:</strong> ${this.userProfile.weight} кг</p>
                        <p><strong>Рост:</strong> ${this.userProfile.height} см</p>
                        <p><strong>Уровень активности:</strong> ${this.getActivityLevelName()}</p>
                        <p><strong>Цели:</strong> ${this.userProfile.goals.map(g => this.getGoalName(g)).join(', ')}</p>
                    </div>
                    <button id="edit-profile-btn" class="btn btn-secondary"><i class="fas fa-edit"></i> Изменить профиль</button>
                </div>
                <div class="card">
                    <h3><i class="fas fa-bullseye"></i> Цели</h3>
                    <div class="goals-settings">
                        <div class="form-group">
                            <label for="steps-goal"><i class="fas fa-walking"></i> Цель по шагам</label>
                            <input type="number" id="steps-goal" value="${this.healthData.stepsGoal}">
                        </div>
                        <div class="form-group">
                            <label for="water-goal"><i class="fas fa-tint"></i> Цель по воде (мл)</label>
                            <input type="number" id="water-goal" value="${this.healthData.waterGoal}">
                        </div>
                        <div class="form-group">
                            <label for="calories-goal"><i class="fas fa-fire"></i> Цель по калориям</label>
                            <input type="number" id="calories-goal" value="${this.healthData.caloriesGoal}">
                        </div>
                        <button id="save-goals-btn" class="btn btn-primary"><i class="fas fa-save"></i> Сохранить цели</button>
                    </div>
                </div>
                <div class="card">
                    <h3><i class="fas fa-trash"></i> Очистить данные</h3>
                    <button id="reset-data-btn" class="btn btn-danger"><i class="fas fa-trash"></i> Сбросить все данные</button>
                </div>
            </div>
        `;
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.showSurvey();
        });
        document.getElementById('save-goals-btn').addEventListener('click', () => {
            this.healthData.stepsGoal = parseInt(document.getElementById('steps-goal').value) || 10000;
            this.healthData.waterGoal = parseInt(document.getElementById('water-goal').value) || 2000;
            this.healthData.caloriesGoal = parseInt(document.getElementById('calories-goal').value) || 2000;
            this.saveUserData();
            alert('Цели успешно сохранены!');
        });
        document.getElementById('reset-data-btn').addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.')) {
                let healthData = JSON.parse(localStorage.getItem('health_data') || '[]');
                healthData = healthData.filter(d => d.user_id !== this.currentUser.id);
                localStorage.setItem('health_data', JSON.stringify(healthData));

                this.healthData = {
                    steps: 0,
                    distance: 0,
                    caloriesBurned: 0,
                    waterIntake: 0,
                    caloriesConsumed: 0,
                    activities: [],
                    foods: [],
                    stepsGoal: this.healthData.stepsGoal,
                    waterGoal: this.healthData.waterGoal,
                    caloriesGoal: this.healthData.caloriesGoal
                };
                this.history = [];
                this.saveUserData();
                this.updateUI();
                alert('Все данные сброшены.');
            }
        });
    }

    showAdminPanel() {
        document.getElementById('app').style.display = 'none';
        document.getElementById('admin-modal').style.display = 'flex';

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let userList = '<h3>Список пользователей</h3><ul class="user-list">';
        users.forEach(user => {
            if (!user.is_admin) {
                userList += `
                    <li class="user-item" data-user-id="${user.id}">
                        <span>${user.login}</span>
                    </li>
                `;
            }
        });
        userList += '</ul>';

        userList += '<button id="admin-logout-btn" class="btn btn-danger btn-block"><i class="fas fa-sign-out-alt"></i> Выйти из аккаунта</button>';

        document.getElementById('admin-users').innerHTML = userList;

        document.getElementById('admin-logout-btn').addEventListener('click', () => {
            this.logout();
        });

        document.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = parseInt(item.getAttribute('data-user-id'));
                this.showUserStats(userId);
            });
        });
    }

    showUserStats(userId) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const healthData = JSON.parse(localStorage.getItem('health_data') || '[]');
        const user = users.find(u => u.id === userId);
        const userHistory = healthData.filter(d => d.user_id === userId);

        let statsContent = `
            <div class="user-stats">
                <h3>Статистика пользователя: ${user.login}</h3>
                <div class="progress-charts">
                    <div class="card">
                        <h4><i class="fas fa-walking"></i> Шаги за неделю</h4>
                        <div class="chart" id="user-steps-chart">
                            <canvas id="stepsChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h4><i class="fas fa-tint"></i> Потребление воды</h4>
                        <div class="chart" id="user-water-chart">
                            <canvas id="waterChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h4><i class="fas fa-utensils"></i> Калории</h4>
                        <div class="chart" id="user-calories-chart">
                            <canvas id="caloriesChart"></canvas>
                        </div>
                    </div>
                </div>
                <button id="back-to-users-btn" class="btn btn-secondary btn-block"><i class="fas fa-arrow-left"></i> Назад</button>
            </div>
        `;

        document.getElementById('admin-users').innerHTML = statsContent;

        this.initCharts(userHistory);

        document.getElementById('back-to-users-btn').addEventListener('click', () => {
            this.showAdminPanel();
        });
    }

    getActivityLevelName() {
        switch(this.userProfile.activityLevel) {
            case 'low': return 'Низкий';
            case 'medium': return 'Средний';
            case 'high': return 'Высокий';
            default: return 'Не указан';
        }
    }

    getGoalName(goal) {
        switch(goal) {
            case 'weight-loss': return 'Похудение';
            case 'muscle-gain': return 'Набор массы';
            case 'fitness': return 'Поддержание формы';
            default: return goal;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HealthTracker();
});