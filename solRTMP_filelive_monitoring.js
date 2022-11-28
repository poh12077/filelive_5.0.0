const xlsx = require("xlsx");
//const fs = require('fs');
const fs = require('graceful-fs');
const axios = require('axios');
const e = require("express");
const { exceptions } = require("winston");


class video_info {
    constructor(id, end_time, ad_list) {
        this.id = id;
        this.end_time = end_time;
        this.ad_point = ad_list;
    }
}

//time ='2012-05-17 10:20:30'
let convertKST2UnixTimestamp = (time) => {
    try {
        return Math.floor(new Date(time).getTime());
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let time_converter = (x) => {
    try {
        if (typeof (x) === 'string') {
            if (isNaN(Number(x))) {
                const y = x.split(':');
                if (y.length != 3) {
                    throw new Error();
                }
                let time = (parseInt(y[0]) * 3600 + parseInt(y[1]) * 60 + parseFloat(y[2])) * 1000;
                return time;
            }
            else {
                return x;
            }
        }
        else if (typeof (x) == 'number') {
            return x;
        }
        else {
            throw new Error();
        }
    }
    catch (err) {
        console.log('[error] time parse');
        console.log(err);
        process.exit(1);
    }
}

let read_conf_samsung = (file_name) => {
    try {
        let conf_file = fs.readFileSync(file_name, 'utf8');
        conf_file = JSON.parse(conf_file);

        let conf = {
            excel: '',
            log: '',
            option: 0,
            start_date_samsung: '',
            current_time: '',
            error_tolerance: 0,
            period: 0,
            test: 0,

            ad_duration: {
                samsung_korea: '',
                samsung_northern_america: ''
            },
            ad_interval: {
                samsung_korea: '',
                samsung_northern_america: ''
            },
            ad_name: {
                samsung_korea: '',
                samsung_northern_america: ''
            },
            id_prefix: {
                content: '',
                ad: ''
            }
        }

        conf.excel = conf_file.excel;
        conf.log = conf_file.log;
        conf.option = conf_file.option;
        conf.start_date_samsung = conf_file.start_date_samsung;
        conf.current_time = conf_file.current_time;
        conf.error_tolerance = conf_file.error_tolerance;
        conf.period = conf_file.period;
        conf.test = conf_file.test;
        conf.id_prefix.content = conf_file.id_prefix.content;
        conf.id_prefix.ad = conf_file.id_prefix.ad;

        // conf.current_time = convertKST2UnixTimestamp(conf_file.current_time);
        for (let sheet in conf.start_date_samsung) {
            conf.start_date_samsung[sheet] = convertKST2UnixTimestamp(conf.start_date_samsung[sheet]);
        }

        conf.ad_duration.samsung_korea = conf_file.ad_duration.samsung_korea;
        conf.ad_duration.samsung_northern_america = conf_file.ad_duration.samsung_northern_america;
        conf.ad_interval.samsung_korea = conf_file.ad_interval.samsung_korea;
        conf.ad_interval.samsung_northern_america = conf_file.ad_interval.samsung_northern_america;
        conf.ad_name.samsung_korea = conf_file.ad_name.samsung_korea;
        conf.ad_name.samsung_northern_america = conf_file.ad_name.samsung_northern_america;

        if (conf.option < 1 || conf.option > 4 || conf.current_time <= 0
            || conf.ad_duration.samsung_korea <= 0 || conf.ad_duration.samsung_northern_america <= 0 || conf.ad_interval.samsung_korea <= 0
            || conf.ad_interval.samsung_northern_america <= 0 || conf.ad_name.samsung_korea.length <= 0
            || conf.ad_name.samsung_northern_america.length <= 0 || !Number.isInteger(conf.error_tolerance) || conf.period <= 0
            || conf.id_prefix.content.length <= 0 || conf.id_prefix.ad.length <= 0) {
            throw new Error();
        }

        return conf;
    } catch (err) {
        console.log('[error] configure.conf ');
        console.log(err);
        process.exit(1);
    }
}


let readConfig = (file_name) => {
    try {
        let conf = fs.readFileSync(file_name, 'utf8');
        conf = JSON.parse(conf);

        // let conf = {
        //     excel: '',
        //     log: '',
        //     option: 0,
        //     start_date_pluto: '',
        //     current_time: '',
        //     error_tolerance: 0,
        //     period: 0,
        //     test: 0,

        //     ad_duration: {
        //         pluto: '',
        //     },
        //     ad_name: {
        //         pluto: '',
        //     },
        //     id_prefix: {
        //         content: '',
        //         ad: ''
        //     }
        // }

        // conf.excel = conf_file.excel;
        // conf.log = conf_file.log;
        // conf.option = conf_file.option;
        // conf.start_date_pluto = conf_file.start_date_pluto;
        // conf.current_time = conf_file.current_time;
        // conf.error_tolerance = conf_file.error_tolerance;
        // conf.period = conf_file.period;
        // conf.test = conf_file.test;
        // conf.id_prefix.content = conf_file.id_prefix.content;
        // conf.id_prefix.ad = conf_file.id_prefix.ad;

        // conf.current_time = convertKST2UnixTimestamp(conf_file.current_time);

        for (let sheet in conf.start_date_pluto) {
            conf.start_date_pluto[sheet] = convertKST2UnixTimestamp(conf.start_date_pluto[sheet]);
        }
        for (let sheet in conf.start_date_samsung) {
            conf.start_date_samsung[sheet] = convertKST2UnixTimestamp(conf.start_date_samsung[sheet]);
        }


        if (conf.option < 1 || conf.option > 4 || conf.ad_duration.pluto <= 0
            || conf.ad_name.pluto.length <= 0 || !Number.isInteger(conf.error_tolerance)) {
            throw new Error();
        }

        return conf;
    } catch (err) {
        console.log('[error] configure.conf ');
        console.log(err);
        process.exit(1);
    }
}


let read_excel = (excel, conf, i) => {
    try {
        const sheet_name = excel.SheetNames[i];
        const sheet_data = excel.Sheets[sheet_name];
        if (conf.option == 3 || conf.option == 4) {
            if ((sheet_data.E1.v != 'Ad Point 1') || (sheet_data.F1.v != 'Ad Point 2')
                || (sheet_data.G1.v != 'Ad Point 3') || (sheet_data.H1.v != 'Ad Point 4')
                || (sheet_data.I1.v != 'Ad Point 5')) {
                throw new Error('[error] excel Ad Point title');
            }
        }
        let json = xlsx.utils.sheet_to_json(sheet_data);
        return json;
    } catch (err) {
        console.log('[error] excel');
        console.log(err);
        process.exit(1);
    }
}

let parser_excel = (json, conf, sheet, excel) => {
    try {
        let schedule = [];
        let sheet_num = 'sheet_' + sheet.toString();
        let end_time;
        if (conf.option == 1 || conf.option == 2) { end_time = conf.start_date_samsung[sheet_num] };
        if (conf.option == 3 || conf.option == 4) { end_time = conf.start_date_pluto[sheet_num] };

        let ad_list = [];
        let m;
        if (conf.option == 1 || conf.option == 2) { m = conf.start_date_samsung[sheet_num] };
        if (conf.option == 3 || conf.option == 4) { m = conf.start_date_pluto[sheet_num] };

        for (let i = 0; i < json.length; i++) {
            if (json[i].id !== undefined) {
                end_time += json[i]['__EMPTY'];
                //advertisement pluto
                if (conf.option == 3 || conf.option == 4) {
                    for (let k = 1; k < 6; k++) {
                        if (json[i]['Ad Point ' + k.toString()] != undefined) {
                            let ad = {
                                start: '',
                                end: ''
                            }
                            end_time += conf.ad_duration.pluto;
                            ad.start = time_converter(json[i]['Ad Point ' + k.toString()]) + schedule[i - 2].end_time;
                            if (k != 1) { ad.start += conf.ad_duration.pluto * (k - 1); }
                            ad.end = ad.start + conf.ad_duration.pluto;
                            ad_list.push(ad);
                        }
                    }
                }
                //advertisement samsung 
                else if (conf.option == 1 || conf.option == 2) {
                    //north america
                    if (excel.SheetNames[sheet] === 'north america') {
                        for (let k = 1; k > 0; k++) {
                            if (json[i]['__EMPTY'] <= conf.ad_interval.samsung_northern_america * k) {
                                break;
                            }
                            let ad = {
                                start: '',
                                end: ''
                            }
                            ad.start = m + conf.ad_interval.samsung_northern_america;
                            ad.end = ad.start + conf.ad_duration.samsung_northern_america;
                            m = ad.end;
                            end_time += conf.ad_duration.samsung_northern_america;
                            ad_list.push(ad);
                        }
                    } else {
                        //korea
                        for (let k = 1; k > 0; k++) {
                            if (json[i]['__EMPTY'] <= conf.ad_interval.samsung_korea * k) {
                                break;
                            }
                            let ad = {
                                start: '',
                                end: ''
                            }
                            ad.start = m + conf.ad_interval.samsung_korea;
                            ad.end = ad.start + conf.ad_duration.samsung_korea;
                            m = ad.end;
                            end_time += conf.ad_duration.samsung_korea;
                            ad_list.push(ad);
                        }
                    }
                }
                else {
                    throw new Error('[error] configure option');
                }

                schedule.push(new video_info(json[i]['id'], end_time, ad_list));
                ad_list = [];
                m = end_time;
            }
        }
        return schedule;
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}


let parser_excel_for_timetable = (json, conf, sheet, excel) => {
    try {
        let schedule = [];
        let schedule_date = [];

        let sheet_num = 'sheet_' + sheet.toString();
        let end_time;
        if (conf.option == 1 || conf.option == 2) { end_time = conf.start_date_samsung[sheet_num] };
        if (conf.option == 3 || conf.option == 4) { end_time = conf.start_date_pluto[sheet_num] };

        let ad_list = [];
        let ad_list_date = [];

        let m;
        if (conf.option == 1 || conf.option == 2) { m = conf.start_date_samsung[sheet_num] };
        if (conf.option == 3 || conf.option == 4) { m = conf.start_date_pluto[sheet_num] };

        for (let i = 0; i < json.length; i++) {
            if (json[i].id !== undefined) {
                end_time += json[i]['__EMPTY'];
                //advertisement pluto
                if (conf.option == 3 || conf.option == 4) {
                    for (let k = 1; k < 6; k++) {
                        if (json[i]['Ad Point ' + k.toString()] != undefined) {
                            let ad = {
                                start: '',
                                end: ''
                            }
                            end_time += conf.ad_duration.pluto;
                            ad.start = time_converter(json[i]['Ad Point ' + k.toString()]) + schedule[i - 2].end_time;
                            if (k != 1) { ad.start += conf.ad_duration.pluto * (k - 1); }
                            ad.end = ad.start + conf.ad_duration.pluto;
                            ad_list.push(ad);

                            let ad_date = {
                                start: '',
                                end: ''
                            }
                            ad_date.start = Unix_timestamp(ad.start / 1000);
                            ad_date.end = Unix_timestamp(ad.end / 1000);
                            ad_list_date.push(ad_date);
                        }
                    }
                }
                //advertisement samsung 
                else if (conf.option == 1 || conf.option == 2) {
                    //north america
                    if (excel.SheetNames[sheet] === 'north america') {
                        for (let k = 1; k > 0; k++) {
                            if (json[i]['__EMPTY'] <= conf.ad_interval.samsung_northern_america * k) {
                                break;
                            }
                            let ad = {
                                start: '',
                                end: ''
                            }
                            ad.start = m + conf.ad_interval.samsung_northern_america;
                            ad.end = ad.start + conf.ad_duration.samsung_northern_america;
                            m = ad.end;
                            end_time += conf.ad_duration.samsung_northern_america;
                            ad_list.push(ad);

                            let ad_date = {
                                start: '',
                                end: ''
                            }
                            ad_date.start = Unix_timestamp(ad.start / 1000);
                            ad_date.end = Unix_timestamp(ad.end / 1000);
                            ad_list_date.push(ad_date);
                        }
                    } else {
                        //korea
                        for (let k = 1; k > 0; k++) {
                            if (json[i]['__EMPTY'] <= conf.ad_interval.samsung_korea * k) {
                                break;
                            }
                            let ad = {
                                start: '',
                                end: ''
                            }

                            ad.start = m + conf.ad_interval.samsung_korea;
                            ad.end = ad.start + conf.ad_duration.samsung_korea;
                            m = ad.end;
                            end_time += conf.ad_duration.samsung_korea;
                            ad_list.push(ad);

                            let ad_date = {
                                start: '',
                                end: ''
                            }
                            ad_date.start = Unix_timestamp(ad.start / 1000);
                            ad_date.end = Unix_timestamp(ad.end / 1000);
                            ad_list_date.push(ad_date);
                        }
                    }
                }
                else {
                    throw new Error('[error] configure option');
                }

                schedule.push(new video_info(json[i]['id'], end_time, ad_list));
                schedule_date.push(new video_info(json[i]['id'], Unix_timestamp(end_time / 1000), ad_list_date));
                ad_list = [];
                ad_list_date = [];

                m = end_time;
            }
        }
        // return schedule_date;
        return schedule;

    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}


//time = '2012-05-17 10:20:30'
let id_finder_excel = (schedule, conf, channel, running_video, current_time, excel) => {
    try {
        channel = channel.toString();
        let sheet_num = 'sheet_' + channel;
        //pluto
        if (conf.option == 3 || conf.option == 4) {
            for (let i = 0; i < schedule.length - 1; i++) {
                if ((schedule[i].end_time < current_time) && (current_time <= schedule[i + 1].end_time)) {
                    if (schedule[i + 1].ad_point.length == 5) {
                        for (let k = 0; k < 5; k++) {
                            //advertisement
                            if ((schedule[i + 1].ad_point[k].start <= current_time) && (current_time <= schedule[i + 1].ad_point[k].end)) {
                                running_video.excel.pluto[channel] = conf.ad_name.pluto;
                                running_video.excel.time = new Date(current_time);
                                running_video.excel.play_time.current = current_time - schedule[i + 1].ad_point[k].start;
                                running_video.excel.play_time.total = schedule[i + 1].ad_point[k].end - schedule[i + 1].ad_point[k].start;
                                return "cocos_ad_120s_us";
                            }
                        }
                    }
                    // content
                    running_video.excel.pluto[channel] = schedule[i + 1].id;
                    running_video.excel.time = new Date(current_time);
                    for (let k = 0; k < 4; k++) {
                        if ((schedule[i + 1].ad_point[k].end < current_time) && (current_time < schedule[i + 1].ad_point[k + 1].start)) {
                            running_video.excel.play_time.current = current_time - schedule[i + 1].ad_point[k].end;
                            running_video.excel.play_time.total = schedule[i + 1].ad_point[k + 1].start - schedule[i + 1].ad_point[k].end;
                            return 0;
                        }
                    }
                    if (current_time < schedule[i + 1].ad_point[0].start) {
                        running_video.excel.play_time.current = current_time - schedule[i].end_time;
                        running_video.excel.play_time.total = schedule[i + 1].ad_point[0].start - schedule[i].end_time;
                    } else if (schedule[i + 1].ad_point[4].end < current_time) {
                        running_video.excel.play_time.current = current_time - schedule[i + 1].ad_point[4].end;
                        running_video.excel.play_time.total = schedule[i + 1].end_time - schedule[i + 1].ad_point[4].end;
                    }
                    return schedule[i + 1].id;
                }
            }

            if ((conf.start_date_pluto[sheet_num] <= current_time) && (current_time <= schedule[0].end_time)) {
                // the first video is streaming now
                if (schedule[0].ad_point.length == 5) {
                    for (let k = 0; k < 5; k++) {
                        //advertisement
                        if ((schedule[0].ad_point[k].start <= current_time) && (current_time <= schedule[0].ad_point[k].end)) {
                            running_video.excel.pluto[channel] = conf.ad_name.pluto;
                            running_video.excel.time = new Date(current_time);
                            running_video.excel.play_time.current = current_time - schedule[0].ad_point[k].start;
                            running_video.excel.play_time.total = schedule[0].ad_point[k].end - schedule[0].ad_point[k].start;

                            return "cocos_ad_120s_us";
                        }
                    }
                }
                //content
                running_video.excel.pluto[channel] = schedule[0].id;
                running_video.excel.time = new Date(current_time);
                for (let k = 0; k < 4; k++) {
                    if ((schedule[0].ad_point[k].end < current_time) && (current_time < schedule[0].ad_point[k + 1].start)) {
                        running_video.excel.play_time.current = current_time - schedule[0].ad_point[k].end;
                        running_video.excel.play_time.total = schedule[0].ad_point[k + 1].start - schedule[0].ad_point[k].end;
                        return 0;
                    }
                }
                if (current_time < schedule[0].ad_point[0].start) {
                    running_video.excel.play_time.current = current_time - conf.start_date_pluto[sheet_num];
                    running_video.excel.play_time.total = schedule[0].ad_point[0].start - conf.start_date_pluto[sheet_num];
                } else if (schedule[0].ad_point[4].end < current_time) {
                    running_video.excel.play_time.current = current_time - schedule[0].ad_point[4].end;
                    running_video.excel.play_time.total = schedule[0].end_time - schedule[0].ad_point[4].end;
                }

                return schedule[0].id;
            }
            else if ((current_time < conf.start_date_pluto[sheet_num]) || (schedule[schedule.length - 1].end_time < current_time)) {
                throw new Error('[error] start_date or end_time');
            }
            else {
                throw new Error();
            }
        }
        //samsung
        else if (conf.option == 1 || conf.option == 2) {
            let play_time = {
                current: '',
                total: ''
            }
            let num_of_ad;
            for (let i = 0; i < schedule.length - 1; i++) {
                if ((schedule[i].end_time < current_time) && (current_time <= schedule[i + 1].end_time)) {
                    num_of_ad = schedule[i + 1].ad_point.length;
                    for (let k = 0; k < num_of_ad; k++) {
                        if ((schedule[i + 1].ad_point[k].start <= current_time) && (current_time <= schedule[i + 1].ad_point[k].end)) {
                            // console.log(new Date(), 'cocos_ad_60s_20210528_2mbps is streaming on the', schedule[i + 1].id);
                            //advertisement
                            if (excel.SheetNames[channel] == 'north america') {
                                if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                                    running_video.excel.samsung[mapping_table[channel]] = conf.ad_name.samsung_northern_america;
                                    running_video.excel.time = new Date(current_time);
                                    play_time.current = current_time - schedule[i + 1].ad_point[k].start;
                                    play_time.total = schedule[i + 1].ad_point[k].end - schedule[i + 1].ad_point[k].start;
                                    running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;

                                }
                            }
                            else {
                                if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                                    running_video.excel.samsung[mapping_table[channel]] = conf.ad_name.samsung_korea;
                                    running_video.excel.time = new Date(current_time);
                                    play_time.current = current_time - schedule[i + 1].ad_point[k].start;
                                    play_time.total = schedule[i + 1].ad_point[k].end - schedule[i + 1].ad_point[k].start;
                                    running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                                }
                            }
                            return "cocos_ad_60s_20210528_2mbps";
                        }
                    }
                    //console.log(new Date(), schedule[i + 1].id);
                    //content
                    if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                        running_video.excel.samsung[mapping_table[channel]] = schedule[i + 1].id;
                        running_video.excel.time = new Date(current_time);
                        for (let k = 0; k < num_of_ad - 1; k++) {
                            if ((schedule[i + 1].ad_point[k].end < current_time) && (current_time < schedule[i + 1].ad_point[k + 1].start)) {
                                play_time.current = current_time - schedule[i + 1].ad_point[k].end;
                                play_time.total = schedule[i + 1].ad_point[k + 1].start - schedule[i + 1].ad_point[k].end;
                                running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                                return 0;
                            }
                        }
                        if (current_time < schedule[i + 1].ad_point[0].start) {
                            play_time.current = current_time - schedule[i].end_time;
                            play_time.total = schedule[i + 1].ad_point[0].start - schedule[i].end_time;
                            running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                        } else if (schedule[i + 1].ad_point[num_of_ad - 1].end < current_time) {
                            play_time.current = current_time - schedule[i + 1].ad_point[num_of_ad - 1].end;
                            play_time.total = schedule[i + 1].end_time - schedule[i + 1].ad_point[num_of_ad - 1].end;
                            running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                        }

                    }
                    return schedule[i + 1].id;
                }
            }

            if ((conf.start_date_samsung[sheet_num] <= current_time) && (current_time <= schedule[0].end_time)) {
                // the first video is streaming now
                num_of_ad = schedule[0].ad_point.length;
                for (let k = 0; k < num_of_ad; k++) {
                    if ((schedule[0].ad_point[k].start <= current_time) && (current_time <= schedule[0].ad_point[k].end)) {
                        //advertisement
                        if (excel.SheetNames[channel] == 'north america') {
                            if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                                running_video.excel.samsung[mapping_table[channel]] = conf.ad_name.samsung_northern_america;
                                running_video.excel.time = new Date(current_time);
                                play_time.current = current_time - schedule[0].ad_point[k].start;
                                play_time.total = schedule[0].ad_point[k].end - schedule[0].ad_point[k].start;
                                running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                            }
                        }
                        else {
                            if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                                running_video.excel.samsung[mapping_table[channel]] = conf.ad_name.samsung_korea;
                                running_video.excel.time = new Date(current_time);
                                play_time.current = current_time - schedule[0].ad_point[k].start;
                                play_time.total = schedule[0].ad_point[k].end - schedule[0].ad_point[k].start;
                                running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                            }
                        }
                        return "cocos_ad_60s_20210528_2mbps";
                    }
                }
                //content
                if (!running_video.terminated_channel.includes(mapping_table[channel])) {
                    running_video.excel.samsung[mapping_table[channel]] = schedule[0].id;
                    running_video.excel.time = new Date(current_time);
                    for (let k = 0; k < num_of_ad - 1; k++) {
                        if ((schedule[0].ad_point[k].end < current_time) && (current_time < schedule[0].ad_point[k + 1].start)) {
                            play_time.current = current_time - schedule[0].ad_point[k].end;
                            play_time.total = schedule[0].ad_point[k + 1].start - schedule[0].ad_point[k].end;
                            running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                            return 0;
                        }
                    }
                    if (current_time < schedule[0].ad_point[0].start) {
                        play_time.current = current_time - conf.start_date_samsung[sheet_num];
                        play_time.total = schedule[0].ad_point[0].start - conf.start_date_samsung[sheet_num];
                        running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                    } else if (schedule[0].ad_point[num_of_ad - 1].end < current_time) {
                        play_time.current = current_time - schedule[0].ad_point[num_of_ad - 1].end;
                        play_time.total = schedule[0].end_time - schedule[0].ad_point[num_of_ad - 1].end;
                        running_video.excel.play_time_samsung[mapping_table[channel]] = play_time;
                    }

                }
                return schedule[0].id;
            }
            else if ((current_time < conf.start_date_samsung[sheet_num]) || (schedule[schedule.length - 1].end_time < current_time)) {
                // throw new Error('[error] start_date or end_time');
                return 0;
            }
            else {
                throw new Error();
            }
        }
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let parsePlutoLog = (conf) => {
    let file = fs.readFileSync(conf.log, 'utf8');
    let full_log = [];
    full_log = file.split('\n');
    let log = {}

    class line {
        constructor(time, video_id, content_seq, ad_seq, resolution) {
            this.time = time;
            this.video_id = video_id;
            this.content_seq = content_seq;
            this.ad_seq = ad_seq;
            this.resolution = resolution;
        }
    }

    let channel_list = [];

    for (let i = 0; i < full_log.length; i++) {
        try {
            let index = full_log[i].indexOf('started');
            if (index != -1) {
                let time = full_log[i].substr(0, 19);
                time = convertKST2UnixTimestamp(time);
                if( isNaN(time) ){
                    throw new Error("log parse");
                }
                if( full_log[i].indexOf( '(id=' ) == -1){
                    throw new Error("log parse");
                }
                let channel_id = full_log[i].substr(full_log[i].indexOf('(id=')).split('/')[0].substr(4);
                if (!(channel_list.includes(channel_id))) {
                    channel_list.push(channel_id);
                    log[channel_id] = [];
                }
                if(full_log[i].indexOf('schid') == -1 || full_log[i].indexOf( ') started' ) == -1 ){
                    throw new Error("log parse");
                }
                let seq_and_id_and_resolution = full_log[i].slice(full_log[i].indexOf('schid'), full_log[i].indexOf(') started')).split('/');
                let resolution = seq_and_id_and_resolution[1];
                let seq_and_id = seq_and_id_and_resolution[0];
                seq_and_id = seq_and_id.split('_');

                if (seq_and_id[1] == 'ad') {
                    let content_seq = seq_and_id[2];
                    let ad_seq = seq_and_id[3].charAt(0);
                    let video_id = seq_and_id[1];
                    log[channel_id].push(new line(time, video_id, content_seq, ad_seq, resolution));
                } else {
                    let content_seq = seq_and_id[1];
                    let ad_seq = seq_and_id[2].charAt(0);
                    let video_id = seq_and_id[4] + "_" + seq_and_id[5] + "_" + seq_and_id[6];
                    log[channel_id].push(new line(time, video_id, content_seq, ad_seq, resolution));
                }
            }
        } catch (error) {
            fs.appendFileSync('debug.log', error.toString()+"\n");
        }
    }
    return log;
}

let parseSamsungLog = (conf) => {
    let file = fs.readFileSync(conf.log, 'utf8');
    let full_log = [];
    full_log = file.split('\n');
    let log = {}

    class line {
        constructor(time, video_id, content_seq, ad_seq, resolution) {
            this.time = time;
            this.video_id = video_id;
            this.content_seq = content_seq;
            this.ad_seq = ad_seq;
            this.resolution = resolution;
        }
    }

    let channel_list = [];

    for (let i = 0; i < full_log.length; i++) {
        let index = full_log[i].indexOf('started');
        if (index != -1) {
            let time = full_log[i].substr(0, 19);
            time = convertKST2UnixTimestamp(time);
            let channel_id = full_log[i].substr(full_log[i].indexOf('(id=')).split('/')[0].substr(4);
            if (!(channel_list.includes(channel_id))) {
                channel_list.push(channel_id);
                log[channel_id] = [];
            }
            let seq_and_id_and_resolution = full_log[i].slice(full_log[i].indexOf('schid'), full_log[i].indexOf(') started')).split('/');
            let resolution = seq_and_id_and_resolution[1];
            let seq_and_id = seq_and_id_and_resolution[0];
            seq_and_id = seq_and_id.split('_');

            if (seq_and_id[1] == 'ad') {
                let content_seq = seq_and_id[2];
                let ad_seq = seq_and_id[3].charAt(0);
                let video_id = seq_and_id[1];
                log[channel_id].push(new line(time, video_id, content_seq, ad_seq, resolution));
            } else {
                let content_seq = seq_and_id[1];
                let ad_seq = seq_and_id[2].charAt(0);
                let video_id = seq_and_id[4] + "_" + seq_and_id[5];
                log[channel_id].push(new line(time, video_id, content_seq, ad_seq, resolution));
            }
        }
    }
    return log;
}



let id_finder_solrtmp_log_from_end = (log, conf, running_video, current_time) => {
    try {
        let noc_log;
        let debug_log;
        for (let channel in log) {
            //last line check
            if (convertKST2UnixTimestamp(log[channel][log[channel].length - 1].time) <= current_time && current_time < convertKST2UnixTimestamp(log[channel][log[channel].length - 1].time) + 10000) {
                //console.log(channel, log[channel][log[channel].length - 1].video_id);
                if (conf.option == 3) {
                    running_video.solrtmp_log.pluto[channel] = id_synchronizer(log[channel][log[channel].length - 1].video_id, conf);
                    running_video.solrtmp_log.time = new Date(current_time);
                    running_video.solrtmp_log.play_time[channel] = log[channel][log[channel].length - 1].play_time;
                }
                if (conf.option == 1 || conf.option == 2) {
                    running_video.solrtmp_log.samsung[channel] = id_synchronizer(log[channel][log[channel].length - 1].video_id, conf);
                    running_video.solrtmp_log.time = new Date(current_time);
                    running_video.solrtmp_log.play_time[channel] = log[channel][log[channel].length - 1].play_time;
                }
                continue;
            }
            //first line check
            else if (current_time < convertKST2UnixTimestamp(log[channel][0].time)) {
                // throw new Error('[error] current time is earlier than the start time of log');
            }
            //middle line check
            for (let line = log[channel].length - 2; 0 <= line; line--) {
                if ((convertKST2UnixTimestamp(log[channel][line].time) <= current_time) && (current_time < convertKST2UnixTimestamp(log[channel][line + 1].time))) {
                    // console.log(channel, log[channel][line].video_id);
                    if (conf.option == 3) {
                        running_video.solrtmp_log.pluto[channel] = id_synchronizer(log[channel][line].video_id, conf);
                        running_video.solrtmp_log.time = new Date(current_time);
                        running_video.solrtmp_log.play_time[channel] = log[channel][line].play_time;
                    }
                    if (conf.option == 1 || conf.option == 2) {
                        running_video.solrtmp_log.samsung[channel] = id_synchronizer(log[channel][line].video_id, conf);
                        running_video.solrtmp_log.time = new Date(current_time);
                        running_video.solrtmp_log.play_time[channel] = log[channel][line].play_time;
                    }
                    break;
                }
            }
        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}


let id_finder_solrtmp_log_from_start = (log, conf, running_video, current_time) => {
    try {
        let noc_log;
        let debug_log;
        for (let channel in log) {
            //last line check
            if (convertKST2UnixTimestamp(log[channel][log[channel].length - 1].time) == current_time) {
                //console.log(channel, log[channel][log[channel].length - 1].video_id);
                if (conf.option == 3) {
                    running_video.solrtmp_log.pluto[channel] = id_synchronizer(log[channel][log[channel].length - 1].video_id, conf);
                    running_video.solrtmp_log.time = new Date(current_time);
                    running_video.solrtmp_log.play_time = log[channel][log[channel].length - 1].play_time;
                }
                if (conf.option == 1 || conf.option == 2) { running_video.solrtmp_log.samsung[channel] = id_synchronizer(log[channel][log[channel].length - 1].video_id, conf); }
                continue;
            }
            //first line check
            else if (current_time < convertKST2UnixTimestamp(log[channel][0].time)) {
                throw new Error('[error] current time is earlier than the start time of log');
            }
            //middle line check
            for (let line = 0; line < log[channel].length - 1; line++) {
                if ((convertKST2UnixTimestamp(log[channel][line].time) <= current_time) && (current_time < convertKST2UnixTimestamp(log[channel][line + 1].time))) {
                    // console.log(channel, log[channel][line].video_id);
                    if (conf.option == 3) {
                        running_video.solrtmp_log.pluto[channel] = id_synchronizer(log[channel][line].video_id, conf);
                        running_video.solrtmp_log.time = new Date(current_time);
                        running_video.solrtmp_log.play_time = log[channel][line].play_time;
                    }
                    if (conf.option == 1 || conf.option == 2) { running_video.solrtmp_log.samsung[channel] = id_synchronizer(log[channel][line].video_id, conf); }
                    break;
                }
            }
            if (convertKST2UnixTimestamp(log[channel][log[channel].length - 1].time) < current_time) {
                if (conf.option == 1 || conf.option == 2) {
                    if (channel in running_video.excel.samsung) {
                        //console.log(channel, log[channel][log[channel].length - 1].video_id, " done");
                        noc_log = new Date() + ' ' + channel + ' ' + log[channel][log[channel].length - 1].video_id + ' ' + "success";
                        fs.appendFileSync('NOC.log', noc_log + '\n');
                        delete running_video.excel.samsung[channel];
                        running_video.terminated_channel.push(channel);
                        if (Object.keys(running_video.excel.samsung).length == 0) {
                            process.exit(1);
                        }
                    }
                } else if (conf.option == 3) {
                    if (solrtmp_log_channel == channel) {
                        //console.log(channel, log[channel][log[channel].length - 1].video_id, " done");
                        noc_log = new Date() + ' ' + channel + ' ' + log[channel][log[channel].length - 1].video_id + ' ' + "success";
                        fs.appendFileSync('NOC.log', noc_log + '\n');
                        process.exit(1);
                    }

                }
            }

        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

let samsung_smartTV = (json) => {
    try {
        for (let i = 0; i < json.length; i++) {
            if (json[i].id !== undefined) {
                let a = json[i].id.split('_');
                if (a.length != 3) {
                    throw new Error();
                }
                json[i].id = json[i].id.slice(0, -(a[a.length - 1].length + 1));
            }
        }
        return json;
    } catch (err) {
        console.log('[error] samsungTV name parse');
        console.log(err);
        process.exit(1);
    }
}

function preferredOrder(obj, order) {
    var newObject = {};
    for (var i = 0; i < order.length; i++) {
        if (obj.hasOwnProperty(order[i])) {
            newObject[order[i]] = obj[order[i]];
        }
    }
    return newObject;
}

let update_schedule = (schedule, conf) => {
    try {
        let start_date;
        let file_name;

        for (let sheet = 0; sheet < schedule.length; sheet++) {
            if (conf.option == 1) {
                start_date = conf.start_date_samsung["sheet_" + sheet];
                file_name = "samsung_korea_" + sheet + ".json";
            } else if (conf.option == 2) {
                start_date = conf.start_date_samsung["sheet_" + sheet];
                file_name = "samsung_north_america_" + sheet + ".json";
            }
            else if (conf.option == 3 || conf.option == 4) {
                start_date = conf.start_date_pluto["sheet_" + sheet];
                file_name = "pluto_" + sheet + ".json";
            }
            schedule[sheet][0]["start_time"] = start_date;

            for (let seq = 0; seq < schedule[sheet].length; seq++) {
                schedule[sheet][seq]["seq"] = seq + 1;
                if (0 < seq) {
                    schedule[sheet][seq]["start_time"] = schedule[sheet][seq - 1]["end_time"];
                }
                schedule[sheet][seq] = preferredOrder(schedule[sheet][seq], [
                    "id",
                    "seq",
                    "start_time",
                    "end_time",
                    "ad_point"
                ]);
            }

            let file_json = JSON.stringify(schedule[sheet], null, "\t");
            fs.writeFileSync("./timetable/" + file_name, file_json);
        }
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let module_excel = (conf, schedule) => {
    try {
        //read whole excel
        let excel = xlsx.readFile(conf.excel);
        let json;

        //read excel by sheet
        for (let sheet = 0; sheet < excel.SheetNames.length; sheet++) {
            json = read_excel(excel, conf, sheet);
            if (conf.option == 1 || conf.option == 2) {
                json = samsung_smartTV(json);
            }
            schedule.push(parser_excel_for_timetable(json, conf, sheet, excel));
        }
        update_schedule(schedule, conf);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let solrtmp_log_write = (log, file_name) => {
    for (let x in log) {
        for (let i = 0; i < log[x].length; i++) {
            fs.appendFileSync(file_name, x + ' ' + log[x][i].time + ' ' + log[x][i].video_id + '\n');
        }
    }
}

let print_console = (log) => {
    for (let x in log) {
        for (let i = 0; i < log[x].length; i++) {
            console.log(x + ' ' + log[x][i].time + ' ' + log[x][i].video_id);
        }
    }
}

let id_cut = (id, length) => {
    try {
        let y = id.split('_');
        if (length == 2) {
            return y[y.length - 2] + '_' + y[y.length - 1];
        } else if (length == 3) {
            return y[y.length - 3] + '_' + y[y.length - 2] + '_' + y[y.length - 1];
        }
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let id_synchronizer = (id, conf) => {
    let index;
    try {
        if (id.indexOf(conf.id_prefix.content) >= 0) {
            index = id.indexOf(conf.id_prefix.content) + conf.id_prefix.content.length + 1;
            return id.substr(index);
        } else if (id.indexOf(conf.id_prefix.ad) >= 0) {
            index = id.indexOf(conf.id_prefix.ad);
            return id.substr(index);
        } else {
            throw new Error('[error] there is no prefix in the id');
        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

let channel_map = (schedule, log, conf) => {
    let mapping_table = {};
    let break_loop = 0;
    let log_video_id = '';
    for (let channel in log) {
        for (let line = 0; line < log[channel].length; line++) {
            if (log[channel][line].video_id != 'ad') {
                log_video_id = log[channel][line].video_id;
                break;
            }
        }
        for (let excel_sheet = 0; excel_sheet < schedule.length; excel_sheet++) {
            for (let line = 0; line < schedule[excel_sheet].length; line++) {
                if (log_video_id == schedule[excel_sheet][line].id) {
                    mapping_table[excel_sheet] = channel;
                    break_loop = 1;
                    break;
                }
            }
            if (break_loop == 1) {
                break_loop = 0;
                break;
            }
        }
    }
    return mapping_table;
}

let current_time_finder_in_conf = (conf) => {
    try {
        if (conf.current_time === undefined) {
            //real time
            return Math.floor(new Date().getTime());
        }

        let unix_current_time = new Date(conf.current_time).getTime();

        if (isNaN(unix_current_time)) {
            throw new Error('[error] input time');
        }
        else {
            //input time
            return unix_current_time;
        }
    } catch (error) {
        console.log(error);
    }
}

let start_time_finder_in_log = (log) => {
    let start_time = 0;
    //let start_time=convertKST2UnixTimestamp('2032-04-05 08:55:21');
    for (let channel in log) {
        if (start_time < convertKST2UnixTimestamp(log[channel][0].time)) {
            start_time = convertKST2UnixTimestamp(log[channel][0].time);
        }
    }
    return start_time;
}

let end_time_finder_in_log = (log) => {
    let end_time = 0;
    //let start_time=convertKST2UnixTimestamp('2032-04-05 08:55:21');
    for (let channel in log) {
        end_time = convertKST2UnixTimestamp(log[channel][log[channel].length - 1].time);
    }
    return end_time;
}


let time_increment = (current_time, period) => {
    current_time += period;
    return current_time;
}

let time_decrement = (current_time, period) => {
    current_time -= period;
    return current_time;
}


let monitorPluto = (conf) => {
    try {
        let solrtmp_log = parsePlutoLog(conf);
        //solrtmp_log_write(log, './workspace/test.log');

        return solrtmp_log;

    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}


let monitorSamsungKorea = (conf) => {
    try {
        let solrtmp_log = parseSamsungLog(conf);
        //solrtmp_log_write(log, './workspace/test.log');

        return solrtmp_log;

    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

let convert_unixTime_to_date = (time) => {
    time = time / 1000;
    let hours = Math.floor(time / 3600);
    time %= 3600;
    let minutes = Math.floor(time / 60);
    let seconds = (time % 60).toFixed(3);
    if (hours < 10) {
        hours = '0' + hours;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    time = hours + ":" + minutes + ":" + seconds;
    return time;
}

function Unix_timestamp(t) {
    var date = new Date(t * 1000);
    var year = date.getFullYear();
    var month = "0" + (date.getMonth() + 1);
    var day = "0" + date.getDate();
    var hour = "0" + date.getHours();
    var minute = "0" + date.getMinutes();
    var second = "0" + date.getSeconds();
    return year + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hour.substr(-2) + ":" + minute.substr(-2) + ":" + second.substr(-2);
}

let playtime_parser = (playtime) => {
    playtime = playtime.split('/')[0].split('=')[1].split(":");
    playtime = Number(playtime[0]) * 3600 + Number(playtime[1]) * 60 + Number(playtime[2]);

    return playtime;
}

let streaming_detect = (running_video, conf, solrtmp_log_channel, err_count) => {
    try {
        let noc_log;
        let debug_log = {
            excel: '',
            solrtmp_log: ''
        };
        if (conf.option == 1 || conf.option == 2) {
            // detection loop
            for (let channel in running_video.excel.samsung) {
                if (running_video.excel.samsung[channel] === running_video.solrtmp_log.samsung[channel]) {
                    err_count[channel] = 0;
                    let playtime_solrtmp = playtime_parser(running_video.solrtmp_log.play_time[channel]);

                    if (Math.abs(playtime_solrtmp - running_video.excel.play_time_samsung[channel].current / 1000) <= 20) {
                        debug_log.excel = running_video.excel.time.toLocaleString() + ' [excel]       ' + channel + ' ' + running_video.excel.samsung[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time_samsung[channel].current) + '/' + convert_unixTime_to_date(running_video.excel.play_time_samsung[channel].total);
                        debug_log.solrtmp_log = running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + channel + ' ' + running_video.solrtmp_log.samsung[channel] + ' ' + running_video.solrtmp_log.play_time[channel];
                        noc_log = running_video.excel.time.toLocaleString() + ' ' + channel + ' success\n'
                        fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' success\n\n');
                        fs.appendFileSync('NOC.log', noc_log);

                        delete running_video.excel.samsung[channel];
                        running_video.terminated_channel.push(channel);
                        if (Object.keys(running_video.excel.samsung).length == 0) {
                            process.exit(1);
                        }
                    } else {
                        debug_log.excel = running_video.excel.time.toLocaleString() + ' [excel]       ' + channel + ' ' + running_video.excel.samsung[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time_samsung[channel].current) + '/' + convert_unixTime_to_date(running_video.excel.play_time_samsung[channel].total);
                        debug_log.solrtmp_log = running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + channel + ' ' + running_video.solrtmp_log.samsung[channel] + ' ' + running_video.solrtmp_log.play_time[channel];
                        noc_log = running_video.excel.time.toLocaleString() + ' ' + channel + ' fail\n'
                        fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' fail\n\n');
                        fs.appendFileSync('NOC.log', noc_log);

                        delete running_video.excel.samsung[channel];
                        running_video.terminated_channel.push(channel);
                        if (Object.keys(running_video.excel.samsung).length == 0) {
                            process.exit(1);
                        }
                    }
                } else {

                    debug_log.excel = running_video.excel.time.toLocaleString() + ' [excel]       ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total);
                    debug_log.solrtmp_log = running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time[solrtmp_log_channel];
                    fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' Different id\n\n');
                    err_count[channel]++;
                    if (3 < err_count[channel]) {
                        delete running_video.excel.samsung[channel];
                        running_video.terminated_channel.push(channel);
                        // if (Object.keys(running_video.excel.samsung).length == 0) {
                        //     throw new Error('all channel have Different id over 3 ');
                        // }
                    }
                }
                if (Object.keys(running_video.excel.samsung).length == 0) {
                    throw new Error('all channel have Different id over 3 ');
                }
            }
        } else if (conf.option == 3 || conf.option == 4) {
            // detection loop
            for (let channel in running_video.excel.pluto) {
                if (running_video.excel.pluto[channel] === running_video.solrtmp_log.pluto[solrtmp_log_channel]) {
                    err_count[channel] = 0;
                    if (convertKST2UnixTimestamp(running_video.excel.time) != convertKST2UnixTimestamp(running_video.solrtmp_log.time)) {
                        debug_log = new Date().toLocaleString() + ' ' + running_video.solrtmp_log.time.toLocaleString() + ' ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + '[bug] time unsynchronization';
                        fs.appendFileSync('debug.log', debug_log + '\n\n');
                        continue;
                    }
                    let playtime_solrtmp = playtime_parser(running_video.solrtmp_log.play_time[solrtmp_log_channel]);

                    if (Math.abs(playtime_solrtmp - running_video.excel.play_time.current / 1000) <= 20) {
                        debug_log.excel = new Date().toLocaleString() + ' ' + running_video.excel.time.toLocaleString() + ' [excel]       ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total);
                        debug_log.solrtmp_log = new Date().toLocaleString() + ' ' + running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time[solrtmp_log_channel];
                        noc_log = new Date().toLocaleString() + ' ' + solrtmp_log_channel + ' success\n';
                        fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' success\n\n');
                        fs.appendFileSync('NOC.log', noc_log);
                        process.exit(1);
                    } else {
                        debug_log.excel = new Date().toLocaleString() + ' ' + running_video.excel.time.toLocaleString() + ' [excel]       ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total);
                        debug_log.solrtmp_log = new Date().toLocaleString() + ' ' + running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time[solrtmp_log_channel];
                        noc_log = new Date().toLocaleString() + ' ' + solrtmp_log_channel + ' fail\n'
                        fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' fail\n\n');
                        fs.appendFileSync('NOC.log', noc_log);
                        process.exit(1);
                    }
                } else {
                    debug_log.excel = new Date().toLocaleString() + ' ' + running_video.excel.time.toLocaleString() + ' [excel]       ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total);
                    debug_log.solrtmp_log = new Date().toLocaleString() + ' ' + running_video.solrtmp_log.time.toLocaleString() + ' [solRTMP_log] ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time[solrtmp_log_channel];
                    fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + ' Different id\n\n');
                    err_count[channel]++;
                    if (3 < err_count[channel]) {
                        noc_log = new Date().toLocaleString() + ' ' + solrtmp_log_channel + ' fail\n'
                        fs.appendFileSync('debug.log', 'Different id over 3\n\n');
                        fs.appendFileSync('NOC.log', noc_log);
                        throw new Error();
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}



// let streaming_detect_old = (running_video, err_count, conf, solrtmp_log_channel) => {
//     try {
//         let noc_log;
//         let debug_log = {
//             excel: '',
//             solrtmp_log: ''
//         };
//         let default_error_tolerance = (10000 / conf.period) + 1;
//         if (conf.option == 1 || conf.option == 2) {
//             // detection loop
//             for (let channel in running_video.excel.samsung) {
//                 if (running_video.excel.samsung[channel] === running_video.solrtmp_log.samsung[channel]) {
//                     err_count[channel] = 0;
//                     debug_log.excel = '[excel]    ' + new Date() + ' ' + channel + ' ' + running_video.excel.samsung[channel] + ' ' + running_video.excel.play_time + ' ' + 'success';
//                     debug_log.solrtmp_log = '[solRTMP_log]' + new Date() + ' ' + channel + ' ' + running_video.solrtmp_log.samsung[channel] + ' ' + running_video.solrtmp_log.play_time + ' ' + 'success';

//                     fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + '\n');

//                 } else {
//                     debug_log = new Date() + ' ' + channel + ' ' + running_video.excel.samsung[channel] + ' ' + running_video.solrtmp_log.samsung[channel] + ' ' + running_video.solrtmp_log.play_time + ' ' + 'error';
//                     //console.log(new Date(),channel, running_video.excel.samsung[channel], running_video.solrtmp_log.samsung[channel], "error");
//                     fs.appendFileSync('debug.log', debug_log + '\n');
//                     err_count[channel]++;
//                     //need to fix
//                     if (err_count[channel] >= default_error_tolerance + conf.error_tolerance) {
//                         noc_log = new Date() + ' ' + channel + ' ' + running_video.excel.samsung[channel] + ' ' + running_video.solrtmp_log.samsung[channel] + ' ' + 'fail';
//                         //console.log( noc_log );
//                         fs.appendFileSync('NOC.log', noc_log + '\n');
//                         fs.appendFileSync('debug.log', noc_log + '\n');
//                         err_count[channel] = 0;
//                         delete running_video.excel.samsung[channel];
//                         running_video.terminated_channel.push(channel);
//                     }
//                 }
//             }
//             //console.log('\n');
//         } else if (conf.option == 3 || conf.option == 4) {
//             // detection loop
//             for (let channel in running_video.excel.pluto) {
//                 if (running_video.excel.pluto[channel] === running_video.solrtmp_log.pluto[solrtmp_log_channel]) {
//                     err_count[channel] = 0;
//                     if (convertKST2UnixTimestamp(running_video.excel.time) != convertKST2UnixTimestamp(running_video.solrtmp_log.time)) {
//                         debug_log = running_video.solrtmp_log.time + ' ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + '[bug] time unsynchronization';
//                         fs.appendFileSync('debug.log', debug_log + '\n');
//                         continue;
//                     }
//                     // debug_log= running_video.excel.time+' '+solrtmp_log_channel+' '+running_video.excel.pluto[channel]+' '+running_video.solrtmp_log.pluto[solrtmp_log_channel]+' '+running_video.solrtmp_log.play_time+' '+'success';
//                     // fs.appendFileSync('debug.log', debug_log+'\n' );
//                     debug_log.excel = '[excel]       ' + running_video.excel.time + ' ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total) + ' ' + 'success';
//                     debug_log.solrtmp_log = '[solRTMP_log] ' + running_video.solrtmp_log.time + ' ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time + ' ' + 'success';
//                     fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + '\n');
//                 } else {
//                     //console.log(new Date(), running_video.excel.pluto[channel], running_video.solrtmp_log.pluto[solrtmp_log_channel], "error");
//                     // debug_log= running_video.excel.time+' '+solrtmp_log_channel+' '+running_video.excel.pluto[channel]+' '+running_video.solrtmp_log.pluto[solrtmp_log_channel]+' '+running_video.solrtmp_log.play_time+' '+'error';
//                     // fs.appendFileSync('debug.log', debug_log+'\n' );
//                     debug_log.excel = '[excel]       ' + running_video.excel.time + ' ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + 'play=' + convert_unixTime_to_date(running_video.excel.play_time.current) + '/' + convert_unixTime_to_date(running_video.excel.play_time.total) + ' ' + 'error';
//                     debug_log.solrtmp_log = '[solRTMP_log] ' + running_video.solrtmp_log.time + ' ' + solrtmp_log_channel + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + running_video.solrtmp_log.play_time + ' ' + 'error';
//                     fs.appendFileSync('debug.log', debug_log.excel + '\n' + debug_log.solrtmp_log + '\n');
//                     err_count[channel]++;
//                     //need to fix
//                     if (err_count[channel] >= default_error_tolerance + conf.error_tolerance) {
//                         noc_log = running_video.excel.time + ' ' + solrtmp_log_channel + ' ' + running_video.excel.pluto[channel] + ' ' + running_video.solrtmp_log.pluto[solrtmp_log_channel] + ' ' + 'fail';
//                         //console.log( noc_log );
//                         fs.appendFileSync('NOC.log', noc_log + '\n');
//                         fs.appendFileSync('debug.log', noc_log + '\n');
//                         err_count[channel] = 0;
//                         //process.exit(1);
//                     }
//                 }
//             }
//         }
//     } catch (err) {
//         console.log(err);
//         process.exit(1);
//     }
// }


// let channel_match = (schedule, log, conf) => {
//     try {
//         if (conf.option == 1 || conf.option == 2) {
//             mapping_table = channel_map(schedule, log, conf);
//         } else if (conf.option == 3 || conf.option == 4) {
//             for (let property in log) {
//                 return property;
//             }
//         }
//     } catch (err) {
//         console.log(err);
//         process.exit(1);
//     }
// }

let channel_match = (schedule, log, conf) => {
    try {
        mapping_table = channel_map(schedule, log, conf);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}


//initialize err_count
let initialize_err_count = (log, schedule, conf, err_count) => {
    if (conf.option == 1 || conf.option == 2) {
        for (let channel in log) {
            err_count[channel] = 0;
        }
    } else if (conf.option == 3 || conf.option == 4) {
        for (let channel in schedule) {
            err_count[channel] = 0;
        }
    }
}

let detectPluto = (log, schedule, conf) => {
    try {
        for (let channel in log) {
            let detection_ouput = {
                serviceName: conf.serviceName,
                channelID: "",
                resolution: "1080p",
                result: "",
                errorTime: "",
                solrtmp_current_content_id: "",
                excel_current_content_id: ""
            }
            let log_content_seq = log[channel][log[channel].length - 1].content_seq;
            let log_ad_seq = log[channel][log[channel].length - 1].ad_seq;
            let log_video_id = log[channel][log[channel].length - 1].video_id;
            detection_ouput.solrtmp_current_content_id = log_video_id;
            let log_start_time = log[channel][log[channel].length - 1].time;
            detection_ouput.channelID = channel;

            let sheet = 0;
            for (let content = 0; content < schedule[sheet].length; content++) {
                let excel_content_seq = schedule[sheet][content].seq;
                if (excel_content_seq == log_content_seq) {
                    let excel_start_time;
                    if (log_video_id == 'ad') {
                        excel_start_time = schedule[sheet][content].ad_point[log_ad_seq - 1].start;
                    } else {
                        if (log_content_seq == 1) {
                            excel_start_time = schedule[sheet][content].start_time;
                        } else {
                            excel_start_time = schedule[sheet][content].ad_point[log_ad_seq - 2].end;
                        }
                    }
                    detection_ouput.errorTime = excel_start_time - log_start_time;
                    detection_ouput.excel_current_content_id = schedule[sheet][content].id;
                    break;
                }
            }
            //return detection_ouput;
            determineResult(detection_ouput, conf);
        }
    } catch (error) {
        console.log(error);
    }
}

let detectSamsung = (log, schedule, conf) => {
    try {
        let mapping_table = channel_map(schedule, log, conf);

        for (let property in mapping_table) {
            let channel = mapping_table[property];
            let detection_ouput = {
                serviceName: conf.serviceName,
                channelID: "",
                resolution: "1080p",
                result: "",
                errorTime: "",
                solrtmp_current_content_id: "",
                excel_current_content_id: ""
            }
            let log_content_seq = log[channel][log[channel].length - 1].content_seq;
            let log_ad_seq = log[channel][log[channel].length - 1].ad_seq;
            let log_video_id = log[channel][log[channel].length - 1].video_id;
            detection_ouput.solrtmp_current_content_id = log_video_id;
            let log_start_time = log[channel][log[channel].length - 1].time;
            detection_ouput.channelID = channel;

            let sheet = parseInt(property);
            for (let content = 0; content < schedule[sheet].length; content++) {
                let excel_content_seq = schedule[sheet][content].seq;
                if (excel_content_seq == log_content_seq) {
                    let excel_start_time;
                    if (log_video_id == 'ad') {
                        excel_start_time = schedule[sheet][content].ad_point[log_ad_seq - 1].start;
                    } else {
                        if (log_content_seq == 1) {
                            excel_start_time = schedule[sheet][content].start_time;
                        } else {
                            excel_start_time = schedule[sheet][content].ad_point[log_ad_seq - 2].end;
                        }
                    }
                    detection_ouput.errorTime = excel_start_time - log_start_time;
                    detection_ouput.excel_current_content_id = schedule[sheet][content].id;
                    break;
                }
            }
            //return detection_ouput;
            determineResult(detection_ouput, conf);
        }
    } catch (error) {
        console.log(error);
    }
}


let get = (detection_ouput, conf) => {

    let url = conf.NOCDashboardURL;
    let serviceName = conf.serviceName;
    let channelID = detection_ouput.channelID;
    let resolution = detection_ouput.resolution;
    let result = detection_ouput.result;
    let errorTime = detection_ouput.errorTime;
    let serverIP = conf.serverIP;

    axios.get(url, {
        params: {
            serviceName: serviceName,
            channelID: channelID,
            resolution: resolution,
            result: result,
            errorTime: errorTime,
            serverIP: serverIP
        }
    })
        .then(function (response) {
            fs.appendFileSync('debug.log', new Date().toLocaleString() + ' ' + serviceName + ' ' + serverIP + ' ' + channelID + ' ' + resolution + ' ' + errorTime + ' ' + result + '\n');
            console.log(response);
        })
        .catch(function (error) {
            fs.appendFileSync('debug.log', new Date().toLocaleString() + ' ' + serviceName + ' ' + serverIP + ' ' + channelID + ' ' + resolution + ' ' + errorTime + ' ' + result + ' ' + 'nana\n');
            console.log(error);
        })
        .finally(function () {
            // always executed
        });

}

let determineResult = (detection_ouput, conf) => {
    let errorTime = Math.abs(detection_ouput.errorTime);
    let error_tolerance = conf.error_tolerance;

    if (error_tolerance < errorTime) {
        detection_ouput.result = 'fail';
        get(detection_ouput, conf);
    } else {
        detection_ouput.result = 'success';
        get(detection_ouput, conf);
    }
}

let main = () => {
    try {
        const conf = readConfig('config.conf');

        // if( fs.existsSync('monitoring.log') ){
        //     fs.unlinkSync('monitoring.log'); 
        // }
        let solrtmp_log;
        if (conf.option == 1 || conf.option == 2) {
            solrtmp_log = parseSamsungLog(conf);
        } else {
            solrtmp_log = parsePlutoLog(conf);
        }

        let schedule = [];
        module_excel(conf, schedule);
        // pluto_log_channel = channel_match(schedule, solrtmp_log, conf);

        if (conf.option == 1 || conf.option == 2) {
            detectSamsung(solrtmp_log, schedule, conf);
        } else {
            detectPluto(solrtmp_log, schedule, conf);
        }

    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

main();


