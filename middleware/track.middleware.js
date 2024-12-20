const Track = require('../models/Track');
const Settings = require('../models/Settings');

const updateTrack = async (req, res, next) => {
    try {
        const { track, status, date, weight, place, toFilial } = req.body;

        // Получаем текущие настройки для получения цены и валюты
        const settings = await Settings.findOne();
        const pricePerUnit = parseFloat(settings.price);
        const currency = settings.currency;

        // Рассчитываем общую стоимость
        const totalPrice = weight ? (parseFloat(weight) * pricePerUnit).toFixed(2) : null;

        // Проверяем, существует ли трек с переданным номером
        let existingTrack = await Track.findOne({ track });

        if (!existingTrack) {
            // Если трек не существует, создаем новую запись
            const newTrack = new Track({
                track,
                status,
                toFilial: toFilial || null, // Если toFilial не передан, устанавливаем null
                weight,
                place, // Добавляем place для нового трека
                currency,
                price: totalPrice,
                history: [{ status, date }]
            });
            // Сохраняем новый трек
            await newTrack.save();
            return res.status(201).json({ message: 'Новая запись трека успешно создана' });
        } else {
            // Если трек существует, обновляем его данные
            existingTrack.status = status;

            // Обновляем вес, цену и валюту только если они переданы
            if (weight) {
                existingTrack.weight = weight;
                existingTrack.price = totalPrice; // Обновляем цену на основе нового веса
            }

            // Если `place` не было передано, оставляем текущее значение
            if (place) {
                // Проверяем, существует ли уже значение `place` для трека
                existingTrack.place = existingTrack.place || place;
            }

            // Если валюта не была передана, оставляем текущую
            existingTrack.currency = existingTrack.currency || currency;

            // Обновляем toFilial, если передан новый филиал
            if (toFilial && existingTrack.toFilial !== toFilial) {
                existingTrack.toFilial = toFilial;
            }

            // Добавляем новую запись в историю
            existingTrack.history.push({ status, date });

            // Сохраняем обновленный трек
            await existingTrack.save();

            return res.status(200).json({ message: 'Данные трека успешно обновлены' });
        }

    } catch (error) {
        console.error('Ошибка при обновлении или создании трека:', error);
        return res.status(500).json({ message: 'Произошла ошибка при обновлении или создании трека' });
        next(error);
    }
};




const excelTrack = async (req, res, next) => {
    try {
        const { tracks, status, date, toFilial } = req.body;

        // Получаем список уже существующих треков
        const existingTracks = await Track.find({ track: { $in: tracks } });

        // Разделяем массив треков на существующие и новые
        const existingTrackNumbers = existingTracks.map(track => track.track);
        const newTracksData = tracks.filter(track => !existingTrackNumbers.includes(track))
            .map(track => ({
                track,
                status,
                toFilial: toFilial || null, // Если toFilial не передан, устанавливаем null
                history: [{ status, date }]
            }));

        // Обновляем данные существующих треков
        await Track.updateMany({ track: { $in: existingTrackNumbers } }, {
            $set: { status },
            $push: { history: { status, date } },
            // Обновляем toFilial, если передан новый филиал и он отличается от текущего
            ...(toFilial && { $set: { toFilial } })
        });

        // Добавляем новые треки
        if (newTracksData.length > 0) {
            await Track.insertMany(newTracksData);
        }

        return res.status(200).json({ message: 'Данные треков успешно обновлены или созданы' });

    } catch (error) {
        console.error('Ошибка при обновлении или создании треков:', error);
        return res.status(500).json({ message: 'Произошла ошибка при обновлении или создании треков' });
        next(error);
    }
};


module.exports = { updateTrack, excelTrack};
