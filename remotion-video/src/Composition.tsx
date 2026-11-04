import {Audio} from '@remotion/media';
import {TransitionSeries} from '@remotion/transitions';
import {AbsoluteFill, interpolate, staticFile, Track, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArabicTitle} from './ArabicTitle';
import {BasicCaptions} from './basic-captions';
import {CloudWipe} from './CloudWipe';
import {WorldScene} from './WorldScene';

// World Children's Day: the treasure map of children's rights (5 floating islands).
// Narration: Modern Standard Arabic (Fusha), young girl's voice; calm music + SFX underneath.
export const ChildRightsDay: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#ffffff'}}>
      <TransitionSeries name="Scenes">
      <TransitionSeries.Sequence name="Title — World Children's Day" durationInFrames={380}>
        <WorldScene name="Title world" world="title" start={0.0} />
        <BasicCaptions
          name="Title captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " أهلاً", startMs: 3200, endMs: 3612, timestampMs: 3406, confidence: null},
            {text: " بكم", startMs: 3626, endMs: 3958, timestampMs: 3792, confidence: null},
            {text: " يا", startMs: 3971, endMs: 4091, timestampMs: 4031, confidence: null},
            {text: " أصدقائي", startMs: 4104, endMs: 4915, timestampMs: 4509, confidence: null},
            {text: " اليومُ", startMs: 5836, endMs: 6421, timestampMs: 6128, confidence: null},
            {text: " يومٌ", startMs: 6435, endMs: 6874, timestampMs: 6654, confidence: null},
            {text: " مميَّزٌ", startMs: 6887, endMs: 7552, timestampMs: 7219, confidence: null},
            {text: " جدّاً", startMs: 7565, endMs: 8203, timestampMs: 7884, confidence: null},
            {text: " إنَّه", startMs: 9134, endMs: 9599, timestampMs: 9366, confidence: null},
            {text: " يومُ", startMs: 9613, endMs: 9892, timestampMs: 9752, confidence: null},
            {text: " الطفلِ", startMs: 9905, endMs: 10277, timestampMs: 10091, confidence: null},
            {text: " العالمي", startMs: 10291, endMs: 11115, timestampMs: 10703, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 1" seed="wipe-1" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Beach — the treasure map" durationInFrames={892}>
        <WorldScene name="Beach world" world="beach" start={12.656} />
        <BasicCaptions
          name="Beach captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " هل", startMs: 1399, endMs: 1678, timestampMs: 1539, confidence: null},
            {text: " أنتم", startMs: 1692, endMs: 2064, timestampMs: 1878, confidence: null},
            {text: " مستعدّونَ", startMs: 2077, endMs: 2862, timestampMs: 2470, confidence: null},
            {text: " لرحلةٍ", startMs: 2875, endMs: 3553, timestampMs: 3214, confidence: null},
            {text: " بحريّةٍ", startMs: 3567, endMs: 4246, timestampMs: 3907, confidence: null},
            {text: " فيها", startMs: 4258, endMs: 4604, timestampMs: 4431, confidence: null},
            {text: " كنوز", startMs: 4618, endMs: 5283, timestampMs: 4950, confidence: null},
            {text: " في", startMs: 6203, endMs: 6389, timestampMs: 6296, confidence: null},
            {text: " يومٍ", startMs: 6403, endMs: 6815, timestampMs: 6609, confidence: null},
            {text: " مُشمِس", startMs: 6828, endMs: 7506, timestampMs: 7167, confidence: null},
            {text: " قُربَ", startMs: 7679, endMs: 7998, timestampMs: 7839, confidence: null},
            {text: " البحر", startMs: 8011, endMs: 8570, timestampMs: 8291, confidence: null},
            {text: " كنتُ", startMs: 8810, endMs: 9156, timestampMs: 8983, confidence: null},
            {text: " أمشي", startMs: 9168, endMs: 9620, timestampMs: 9394, confidence: null},
            {text: " على", startMs: 9635, endMs: 9821, timestampMs: 9728, confidence: null},
            {text: " الشاطئ", startMs: 9833, endMs: 10564, timestampMs: 10199, confidence: null},
            {text: " وبينَ", startMs: 11877, endMs: 12369, timestampMs: 12123, confidence: null},
            {text: " الرمال", startMs: 12383, endMs: 13061, timestampMs: 12722, confidence: null},
            {text: " لاحظتُ", startMs: 13299, endMs: 13857, timestampMs: 13578, confidence: null},
            {text: " شيئاً", startMs: 13871, endMs: 14297, timestampMs: 14084, confidence: null},
            {text: " يلمعُ", startMs: 14310, endMs: 14789, timestampMs: 14550, confidence: null},
            {text: " مثلَ", startMs: 14802, endMs: 15174, timestampMs: 14988, confidence: null},
            {text: " نجمةٍ", startMs: 15188, endMs: 15746, timestampMs: 15467, confidence: null},
            {text: " صغيرة", startMs: 15760, endMs: 16478, timestampMs: 16119, confidence: null},
            {text: " لقد", startMs: 17412, endMs: 17811, timestampMs: 17611, confidence: null},
            {text: " كانت", startMs: 17825, endMs: 18184, timestampMs: 18004, confidence: null},
            {text: " خريطةَ", startMs: 18197, endMs: 18809, timestampMs: 18503, confidence: null},
            {text: " كنوز", startMs: 18822, endMs: 19474, timestampMs: 19148, confidence: null},
            {text: " ولكن", startMs: 21241, endMs: 21839, timestampMs: 21540, confidence: null},
            {text: " انتبهوا", startMs: 21853, endMs: 22651, timestampMs: 22252, confidence: null},
            {text: " بدلاً", startMs: 23584, endMs: 24129, timestampMs: 23856, confidence: null},
            {text: " من", startMs: 24143, endMs: 24329, timestampMs: 24236, confidence: null},
            {text: " الذهب", startMs: 24342, endMs: 24940, timestampMs: 24641, confidence: null},
            {text: " كانت", startMs: 25154, endMs: 25540, timestampMs: 25347, confidence: null},
            {text: " الخريطةُ", startMs: 25553, endMs: 26298, timestampMs: 25925, confidence: null},
            {text: " تقول", startMs: 26311, endMs: 26989, timestampMs: 26650, confidence: null},
            {text: " كنوزُ", startMs: 27202, endMs: 27694, timestampMs: 27448, confidence: null},
            {text: " حقوقِ", startMs: 27707, endMs: 28159, timestampMs: 27933, confidence: null},
            {text: " الطفل", startMs: 28172, endMs: 28784, timestampMs: 28478, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 2" seed="wipe-2" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="The five islands" durationInFrames={753}>
        <WorldScene name="Islands world" world="islands" start={42.406} />
        <BasicCaptions
          name="Islands captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " قالتِ", startMs: 1600, endMs: 2026, timestampMs: 1813, confidence: null},
            {text: " الخريطةُ", startMs: 2039, endMs: 2744, timestampMs: 2391, confidence: null},
            {text: " بصوتٍ", startMs: 2756, endMs: 3288, timestampMs: 3022, confidence: null},
            {text: " لطيف", startMs: 3301, endMs: 3939, timestampMs: 3620, confidence: null},
            {text: " في", startMs: 4100, endMs: 4339, timestampMs: 4219, confidence: null},
            {text: " كلِّ", startMs: 4353, endMs: 4646, timestampMs: 4499, confidence: null},
            {text: " جزيرةٍ", startMs: 4658, endMs: 5323, timestampMs: 4991, confidence: null},
            {text: " حقٌّ", startMs: 5337, endMs: 5736, timestampMs: 5536, confidence: null},
            {text: " من", startMs: 5749, endMs: 5909, timestampMs: 5829, confidence: null},
            {text: " حقوقِكِ", startMs: 5922, endMs: 6773, timestampMs: 6347, confidence: null},
            {text: " حقٌّ", startMs: 7707, endMs: 8133, timestampMs: 7920, confidence: null},
            {text: " يجعلُكِ", startMs: 8146, endMs: 8771, timestampMs: 8458, confidence: null},
            {text: " آمنة", startMs: 8783, endMs: 9408, timestampMs: 9096, confidence: null},
            {text: " وحقٌّ", startMs: 9594, endMs: 10166, timestampMs: 9880, confidence: null},
            {text: " يجعلُكِ", startMs: 10180, endMs: 10832, timestampMs: 10506, confidence: null},
            {text: " تتعلَّمين", startMs: 10844, endMs: 11868, timestampMs: 11356, confidence: null},
            {text: " وحقٌّ", startMs: 12082, endMs: 12627, timestampMs: 12354, confidence: null},
            {text: " يجعلُكِ", startMs: 12640, endMs: 13278, timestampMs: 12959, confidence: null},
            {text: " تلعبين", startMs: 13292, endMs: 14090, timestampMs: 13691, confidence: null},
            {text: " وحقٌّ", startMs: 14303, endMs: 14861, timestampMs: 14582, confidence: null},
            {text: " يجعلُكِ", startMs: 14875, endMs: 15540, timestampMs: 15207, confidence: null},
            {text: " تعتنينَ", startMs: 15553, endMs: 16258, timestampMs: 15905, confidence: null},
            {text: " بصحّتِكِ", startMs: 16271, endMs: 17189, timestampMs: 16730, confidence: null},
            {text: " وحقٌّ", startMs: 17401, endMs: 17973, timestampMs: 17687, confidence: null},
            {text: " يجعلُكِ", startMs: 17986, endMs: 18638, timestampMs: 18312, confidence: null},
            {text: " تعيشينَ", startMs: 18651, endMs: 19343, timestampMs: 18997, confidence: null},
            {text: " باحترام", startMs: 19356, endMs: 20234, timestampMs: 19795, confidence: null},
            {text: " والآن", startMs: 21165, endMs: 22029, timestampMs: 21597, confidence: null},
            {text: " هيّا", startMs: 22933, endMs: 23292, timestampMs: 23112, confidence: null},
            {text: " نبدأ", startMs: 23305, endMs: 23850, timestampMs: 23577, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 3" seed="wipe-3" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 1 — Protection" durationInFrames={1628}>
        <WorldScene name="Protection world" world="protection" start={67.51} />
        <ArabicTitle
          name="Protection title"
          from={54}
          durationInFrames={108}
          style={{color: '#3d8bfd', fontSize: 104}}
        >
          الجزيرةُ الأولى: كنزُ الحماية
        </ArabicTitle>
        <BasicCaptions
          name="Protection captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " الجزيرةُ", startMs: 2000, endMs: 2758, timestampMs: 2379, confidence: null},
            {text: " الأولى", startMs: 2771, endMs: 3396, timestampMs: 3083, confidence: null},
            {text: " كنزُ", startMs: 3555, endMs: 3887, timestampMs: 3721, confidence: null},
            {text: " الحماية", startMs: 3902, endMs: 4673, timestampMs: 4287, confidence: null},
            {text: " هنا", startMs: 5606, endMs: 5992, timestampMs: 5799, confidence: null},
            {text: " وجدتُ", startMs: 6006, endMs: 6618, timestampMs: 6312, confidence: null},
            {text: " صدفةً", startMs: 6631, endMs: 7229, timestampMs: 6930, confidence: null},
            {text: " كبيرةً", startMs: 7242, endMs: 7947, timestampMs: 7595, confidence: null},
            {text: " تُشبهُ", startMs: 7960, endMs: 8386, timestampMs: 8173, confidence: null},
            {text: " الدرع", startMs: 8399, endMs: 8984, timestampMs: 8692, confidence: null},
            {text: " ابتسمتِ", startMs: 9915, endMs: 10620, timestampMs: 10268, confidence: null},
            {text: " الصدفةُ", startMs: 10634, endMs: 11232, timestampMs: 10933, confidence: null},
            {text: " وقالت", startMs: 11244, endMs: 11975, timestampMs: 11610, confidence: null},
            {text: " حقُّكِ", startMs: 12215, endMs: 12747, timestampMs: 12481, confidence: null},
            {text: " في", startMs: 12760, endMs: 12827, timestampMs: 12794, confidence: null},
            {text: " الحماية", startMs: 12840, endMs: 13625, timestampMs: 13233, confidence: null},
            {text: " وهذا", startMs: 14885, endMs: 15430, timestampMs: 15158, confidence: null},
            {text: " يعني", startMs: 15444, endMs: 16042, timestampMs: 15743, confidence: null},
            {text: " لا", startMs: 16256, endMs: 16495, timestampMs: 16375, confidence: null},
            {text: " أحدَ", startMs: 16507, endMs: 16906, timestampMs: 16707, confidence: null},
            {text: " يضربُكِ", startMs: 16920, endMs: 17731, timestampMs: 17326, confidence: null},
            {text: " ولا", startMs: 17983, endMs: 18315, timestampMs: 18149, confidence: null},
            {text: " أحدَ", startMs: 18330, endMs: 18716, timestampMs: 18523, confidence: null},
            {text: " يدفعُكِ", startMs: 18729, endMs: 19327, timestampMs: 19028, confidence: null},
            {text: " أو", startMs: 19340, endMs: 19566, timestampMs: 19453, confidence: null},
            {text: " يجرُّكِ", startMs: 19580, endMs: 20285, timestampMs: 19932, confidence: null},
            {text: " ولا", startMs: 20537, endMs: 20869, timestampMs: 20703, confidence: null},
            {text: " أحدَ", startMs: 20882, endMs: 21268, timestampMs: 21075, confidence: null},
            {text: " يُزعجُكِ", startMs: 21281, endMs: 22066, timestampMs: 21674, confidence: null},
            {text: " ولا", startMs: 22333, endMs: 22639, timestampMs: 22486, confidence: null},
            {text: " أحدَ", startMs: 22652, endMs: 23011, timestampMs: 22831, confidence: null},
            {text: " يلمسُكِ", startMs: 23024, endMs: 23676, timestampMs: 23350, confidence: null},
            {text: " بطريقةٍ", startMs: 23688, endMs: 24473, timestampMs: 24081, confidence: null},
            {text: " تجعلُكِ", startMs: 24486, endMs: 25178, timestampMs: 24832, confidence: null},
            {text: " غيرَ", startMs: 25191, endMs: 25563, timestampMs: 25377, confidence: null},
            {text: " مرتاحة", startMs: 25577, endMs: 26481, timestampMs: 26029, confidence: null},
            {text: " وإذا", startMs: 27684, endMs: 28189, timestampMs: 27937, confidence: null},
            {text: " حدثَ", startMs: 28203, endMs: 28695, timestampMs: 28449, confidence: null},
            {text: " شيءٌ", startMs: 28708, endMs: 29134, timestampMs: 28921, confidence: null},
            {text: " يُخيفُكِ", startMs: 29147, endMs: 29932, timestampMs: 29540, confidence: null},
            {text: " حتّى", startMs: 30211, endMs: 30610, timestampMs: 30411, confidence: null},
            {text: " لو", startMs: 30623, endMs: 30796, timestampMs: 30710, confidence: null},
            {text: " كانَ", startMs: 30809, endMs: 31062, timestampMs: 30936, confidence: null},
            {text: " الشخصُ", startMs: 31075, endMs: 31540, timestampMs: 31308, confidence: null},
            {text: " معروفاً", startMs: 31554, endMs: 32112, timestampMs: 31833, confidence: null},
            {text: " لديكِ", startMs: 32126, endMs: 32779, timestampMs: 32453, confidence: null},
            {text: " فلا", startMs: 32937, endMs: 33283, timestampMs: 33110, confidence: null},
            {text: " تسكتي", startMs: 33297, endMs: 34068, timestampMs: 33682, confidence: null},
            {text: " توقَّفي", startMs: 35001, endMs: 35586, timestampMs: 35294, confidence: null},
            {text: " فوراً", startMs: 35601, endMs: 36239, timestampMs: 35920, confidence: null},
            {text: " وقولي", startMs: 36477, endMs: 37022, timestampMs: 36750, confidence: null},
            {text: " بصوتٍ", startMs: 37036, endMs: 37594, timestampMs: 37315, confidence: null},
            {text: " واضح", startMs: 37608, endMs: 38180, timestampMs: 37894, confidence: null},
            {text: " لا", startMs: 38300, endMs: 38819, timestampMs: 38559, confidence: null},
            {text: " ثمَّ", startMs: 39748, endMs: 40080, timestampMs: 39914, confidence: null},
            {text: " أخبري", startMs: 40095, endMs: 40534, timestampMs: 40314, confidence: null},
            {text: " شخصاً", startMs: 40547, endMs: 41012, timestampMs: 40779, confidence: null},
            {text: " كبيراً", startMs: 41025, endMs: 41530, timestampMs: 41278, confidence: null},
            {text: " تثقينَ", startMs: 41545, endMs: 42130, timestampMs: 41837, confidence: null},
            {text: " به", startMs: 42143, endMs: 42436, timestampMs: 42289, confidence: null},
            {text: " مثلَ", startMs: 42687, endMs: 43113, timestampMs: 42900, confidence: null},
            {text: " والدَيكِ", startMs: 43126, endMs: 43937, timestampMs: 43532, confidence: null},
            {text: " أو", startMs: 44178, endMs: 44391, timestampMs: 44284, confidence: null},
            {text: " معلّمتِكِ", startMs: 44404, endMs: 45401, timestampMs: 44902, confidence: null},
            {text: " أو", startMs: 45640, endMs: 45879, timestampMs: 45759, confidence: null},
            {text: " أيِّ", startMs: 45893, endMs: 46159, timestampMs: 46026, confidence: null},
            {text: " شخصٍ", startMs: 46172, endMs: 46611, timestampMs: 46391, confidence: null},
            {text: " مسؤول", startMs: 46623, endMs: 47341, timestampMs: 46982, confidence: null},
            {text: " وقالتِ", startMs: 48272, endMs: 48844, timestampMs: 48558, confidence: null},
            {text: " الخريطة", startMs: 48858, endMs: 49616, timestampMs: 49237, confidence: null},
            {text: " طلبُ", startMs: 49842, endMs: 50188, timestampMs: 50015, confidence: null},
            {text: " المساعدةِ", startMs: 50202, endMs: 51080, timestampMs: 50641, confidence: null},
            {text: " شجاعةٌ", startMs: 51092, endMs: 51717, timestampMs: 51405, confidence: null},
            {text: " وليسَ", startMs: 51863, endMs: 52395, timestampMs: 52129, confidence: null},
            {text: " ضَعفاً", startMs: 52408, endMs: 53086, timestampMs: 52747, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 4" seed="wipe-4" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 2 — Education" durationInFrames={1707}>
        <WorldScene name="Education world" world="education" start={121.767} />
        <ArabicTitle
          name="Education title"
          from={54}
          durationInFrames={108}
          style={{color: '#f5a700', fontSize: 104}}
        >
          الجزيرةُ الثانية: كنزُ التعليم
        </ArabicTitle>
        <BasicCaptions
          name="Education captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " الجزيرةُ", startMs: 2000, endMs: 2731, timestampMs: 2365, confidence: null},
            {text: " الثانية", startMs: 2745, endMs: 3503, timestampMs: 3124, confidence: null},
            {text: " كنزُ", startMs: 3636, endMs: 3968, timestampMs: 3802, confidence: null},
            {text: " التعليم", startMs: 3981, endMs: 4779, timestampMs: 4380, confidence: null},
            {text: " في", startMs: 5713, endMs: 5939, timestampMs: 5826, confidence: null},
            {text: " هذه", startMs: 5953, endMs: 6272, timestampMs: 6112, confidence: null},
            {text: " الجزيرةِ", startMs: 6284, endMs: 6989, timestampMs: 6637, confidence: null},
            {text: " وجدتُ", startMs: 7003, endMs: 7482, timestampMs: 7242, confidence: null},
            {text: " كتاباً", startMs: 7495, endMs: 8040, timestampMs: 7767, confidence: null},
            {text: " يلمع", startMs: 8054, endMs: 8573, timestampMs: 8313, confidence: null},
            {text: " فقالَ", startMs: 8812, endMs: 9251, timestampMs: 9031, confidence: null},
            {text: " الكتاب", startMs: 9264, endMs: 9982, timestampMs: 9623, confidence: null},
            {text: " حقُّكِ", startMs: 10221, endMs: 10766, timestampMs: 10493, confidence: null},
            {text: " في", startMs: 10780, endMs: 10847, timestampMs: 10813, confidence: null},
            {text: " التعليم", startMs: 10860, endMs: 11671, timestampMs: 11265, confidence: null},
            {text: " التعليمُ", startMs: 12931, endMs: 13596, timestampMs: 13263, confidence: null},
            {text: " ليسَ", startMs: 13609, endMs: 13995, timestampMs: 13802, confidence: null},
            {text: " مجرَّدَ", startMs: 14008, endMs: 14566, timestampMs: 14287, confidence: null},
            {text: " حصّةٍ", startMs: 14580, endMs: 15112, timestampMs: 14846, confidence: null},
            {text: " وجلوسٍ", startMs: 15125, endMs: 15830, timestampMs: 15477, confidence: null},
            {text: " في", startMs: 15843, endMs: 15910, timestampMs: 15876, confidence: null},
            {text: " الصف", startMs: 15923, endMs: 16548, timestampMs: 16235, confidence: null},
            {text: " التعليمُ", startMs: 17482, endMs: 18227, timestampMs: 17854, confidence: null},
            {text: " يعني", startMs: 18240, endMs: 18666, timestampMs: 18453, confidence: null},
            {text: " أن", startMs: 18679, endMs: 18852, timestampMs: 18765, confidence: null},
            {text: " تفهمي", startMs: 18865, endMs: 19530, timestampMs: 19197, confidence: null},
            {text: " وأن", startMs: 19729, endMs: 20061, timestampMs: 19895, confidence: null},
            {text: " تسألي", startMs: 20075, endMs: 20780, timestampMs: 20427, confidence: null},
            {text: " وأن", startMs: 21006, endMs: 21352, timestampMs: 21179, confidence: null},
            {text: " تحاولي", startMs: 21365, endMs: 22150, timestampMs: 21757, confidence: null},
            {text: " وألّا", startMs: 22389, endMs: 22828, timestampMs: 22608, confidence: null},
            {text: " تخافي", startMs: 22841, endMs: 23360, timestampMs: 23100, confidence: null},
            {text: " من", startMs: 23372, endMs: 23571, timestampMs: 23472, confidence: null},
            {text: " الخطأ", startMs: 23586, endMs: 24331, timestampMs: 23958, confidence: null},
            {text: " حتّى", startMs: 25247, endMs: 25633, timestampMs: 25440, confidence: null},
            {text: " لو", startMs: 25646, endMs: 25819, timestampMs: 25733, confidence: null},
            {text: " كانَ", startMs: 25833, endMs: 26086, timestampMs: 25959, confidence: null},
            {text: " الدرسُ", startMs: 26099, endMs: 26538, timestampMs: 26318, confidence: null},
            {text: " صعباً", startMs: 26551, endMs: 27203, timestampMs: 26877, confidence: null},
            {text: " وحتّى", startMs: 27429, endMs: 27934, timestampMs: 27681, confidence: null},
            {text: " لو", startMs: 27947, endMs: 28120, timestampMs: 28033, confidence: null},
            {text: " أخطأتِ", startMs: 28134, endMs: 28679, timestampMs: 28406, confidence: null},
            {text: " مرّة", startMs: 28692, endMs: 29224, timestampMs: 28958, confidence: null},
            {text: " فليسَت", startMs: 29462, endMs: 30034, timestampMs: 29748, confidence: null},
            {text: " هذه", startMs: 30048, endMs: 30460, timestampMs: 30254, confidence: null},
            {text: " نهايةَ", startMs: 30474, endMs: 30993, timestampMs: 30733, confidence: null},
            {text: " العالم", startMs: 31006, endMs: 31724, timestampMs: 31365, confidence: null},
            {text: " نعودُ", startMs: 32641, endMs: 33187, timestampMs: 32914, confidence: null},
            {text: " ونحاولُ", startMs: 33200, endMs: 33918, timestampMs: 33559, confidence: null},
            {text: " مرّةً", startMs: 33931, endMs: 34410, timestampMs: 34170, confidence: null},
            {text: " أخرى", startMs: 34423, endMs: 35061, timestampMs: 34742, confidence: null},
            {text: " إذا", startMs: 36343, endMs: 36675, timestampMs: 36509, confidence: null},
            {text: " لم", startMs: 36690, endMs: 36876, timestampMs: 36783, confidence: null},
            {text: " تفهمي", startMs: 36889, endMs: 37368, timestampMs: 37128, confidence: null},
            {text: " سؤالاً", startMs: 37381, endMs: 37873, timestampMs: 37627, confidence: null},
            {text: " فاسألي", startMs: 37887, endMs: 38565, timestampMs: 38226, confidence: null},
            {text: " واطلبي", startMs: 38818, endMs: 39363, timestampMs: 39090, confidence: null},
            {text: " شرحاً", startMs: 39376, endMs: 39828, timestampMs: 39602, confidence: null},
            {text: " بطريقةٍ", startMs: 39842, endMs: 40587, timestampMs: 40214, confidence: null},
            {text: " أخرى", startMs: 40599, endMs: 41197, timestampMs: 40898, confidence: null},
            {text: " ودعي", startMs: 41424, endMs: 41982, timestampMs: 41703, confidence: null},
            {text: " فضولَكِ", startMs: 41996, endMs: 42594, timestampMs: 42295, confidence: null},
            {text: " يكبر", startMs: 42608, endMs: 43180, timestampMs: 42894, confidence: null},
            {text: " وأحياناً", startMs: 44113, endMs: 45044, timestampMs: 44578, confidence: null},
            {text: " تكونُ", startMs: 45217, endMs: 45696, timestampMs: 45456, confidence: null},
            {text: " أفضلُ", startMs: 45709, endMs: 46174, timestampMs: 45941, confidence: null},
            {text: " طريقةٍ", startMs: 46188, endMs: 46840, timestampMs: 46514, confidence: null},
            {text: " للتعلُّم", startMs: 46853, endMs: 47491, timestampMs: 47172, confidence: null},
            {text: " أن", startMs: 47503, endMs: 47676, timestampMs: 47590, confidence: null},
            {text: " تشرحي", startMs: 47690, endMs: 48195, timestampMs: 47942, confidence: null},
            {text: " الفكرةَ", startMs: 48209, endMs: 48887, timestampMs: 48548, confidence: null},
            {text: " بكلماتِكِ", startMs: 48901, endMs: 49725, timestampMs: 49313, confidence: null},
            {text: " أنتِ", startMs: 49738, endMs: 50217, timestampMs: 49977, confidence: null},
            {text: " فعندما", startMs: 51134, endMs: 51772, timestampMs: 51453, confidence: null},
            {text: " تشرحين", startMs: 51786, endMs: 52690, timestampMs: 52238, confidence: null},
            {text: " تكونُ", startMs: 52877, endMs: 53303, timestampMs: 53090, confidence: null},
            {text: " المعرفةُ", startMs: 53315, endMs: 54060, timestampMs: 53687, confidence: null},
            {text: " قد", startMs: 54073, endMs: 54272, timestampMs: 54172, confidence: null},
            {text: " أصبحَت", startMs: 54286, endMs: 54884, timestampMs: 54585, confidence: null},
            {text: " في", startMs: 54897, endMs: 55070, timestampMs: 54984, confidence: null},
            {text: " داخلِكِ", startMs: 55084, endMs: 55869, timestampMs: 55476, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 5" seed="wipe-5" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 3 — Play" durationInFrames={1785}>
        <WorldScene name="Play world" world="play" start={178.682} />
        <ArabicTitle
          name="Play title"
          from={54}
          durationInFrames={108}
          style={{color: '#2fae4e', fontSize: 104}}
        >
          الجزيرةُ الثالثة: كنزُ اللعبِ والنشاط
        </ArabicTitle>
        <BasicCaptions
          name="Play captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " الجزيرةُ", startMs: 2000, endMs: 2705, timestampMs: 2352, confidence: null},
            {text: " الثالثة", startMs: 2718, endMs: 3449, timestampMs: 3083, confidence: null},
            {text: " كنزُ", startMs: 3636, endMs: 3968, timestampMs: 3802, confidence: null},
            {text: " اللعبِ", startMs: 3981, endMs: 4460, timestampMs: 4221, confidence: null},
            {text: " والنشاط", startMs: 4474, endMs: 5338, timestampMs: 4906, confidence: null},
            {text: " في", startMs: 6272, endMs: 6471, timestampMs: 6371, confidence: null},
            {text: " هذه", startMs: 6485, endMs: 6804, timestampMs: 6644, confidence: null},
            {text: " الجزيرةِ", startMs: 6817, endMs: 7509, timestampMs: 7163, confidence: null},
            {text: " نجمةٌ", startMs: 7522, endMs: 8107, timestampMs: 7814, confidence: null},
            {text: " مَرِحةٌ", startMs: 8121, endMs: 8759, timestampMs: 8440, confidence: null},
            {text: " ترقصُ", startMs: 8772, endMs: 9291, timestampMs: 9031, confidence: null},
            {text: " فوقَ", startMs: 9304, endMs: 9636, timestampMs: 9470, confidence: null},
            {text: " الرمال", startMs: 9650, endMs: 10368, timestampMs: 10009, confidence: null},
            {text: " قالتِ", startMs: 11299, endMs: 11764, timestampMs: 11531, confidence: null},
            {text: " النجمة", startMs: 11778, endMs: 12483, timestampMs: 12130, confidence: null},
            {text: " حقُّكِ", startMs: 12642, endMs: 13227, timestampMs: 12934, confidence: null},
            {text: " في", startMs: 13240, endMs: 13307, timestampMs: 13273, confidence: null},
            {text: " اللعب", startMs: 13320, endMs: 13932, timestampMs: 13626, confidence: null},
            {text: " اللعبُ", startMs: 15195, endMs: 15767, timestampMs: 15481, confidence: null},
            {text: " يعني", startMs: 15781, endMs: 16220, timestampMs: 16000, confidence: null},
            {text: " أن", startMs: 16234, endMs: 16407, timestampMs: 16320, confidence: null},
            {text: " تتحرَّكي", startMs: 16420, endMs: 17298, timestampMs: 16859, confidence: null},
            {text: " وتستمتعي", startMs: 17523, endMs: 18613, timestampMs: 18068, confidence: null},
            {text: " وتُخفِّفي", startMs: 18853, endMs: 19651, timestampMs: 19252, confidence: null},
            {text: " التوتُّر", startMs: 19664, endMs: 20449, timestampMs: 20056, confidence: null},
            {text: " وتصبحي", startMs: 20662, endMs: 21486, timestampMs: 21074, confidence: null},
            {text: " أقوى", startMs: 21499, endMs: 22111, timestampMs: 21805, confidence: null},
            {text: " ولكن", startMs: 23045, endMs: 23590, timestampMs: 23317, confidence: null},
            {text: " تذكَّري", startMs: 23604, endMs: 24189, timestampMs: 23896, confidence: null},
            {text: " قواعدَ", startMs: 24202, endMs: 24787, timestampMs: 24494, confidence: null},
            {text: " بسيطةً", startMs: 24801, endMs: 25493, timestampMs: 25147, confidence: null},
            {text: " جدّاً", startMs: 25505, endMs: 26063, timestampMs: 25784, confidence: null},
            {text: " نلعبُ", startMs: 26237, endMs: 26782, timestampMs: 26509, confidence: null},
            {text: " بأمان", startMs: 26795, endMs: 27540, timestampMs: 27167, confidence: null},
            {text: " ولا", startMs: 27753, endMs: 28099, timestampMs: 27926, confidence: null},
            {text: " نؤذي", startMs: 28112, endMs: 28484, timestampMs: 28298, confidence: null},
            {text: " أحداً", startMs: 28497, endMs: 29162, timestampMs: 28829, confidence: null},
            {text: " ولا", startMs: 29388, endMs: 29747, timestampMs: 29567, confidence: null},
            {text: " نكسرُ", startMs: 29761, endMs: 30213, timestampMs: 29987, confidence: null},
            {text: " الأشياء", startMs: 30226, endMs: 30997, timestampMs: 30611, confidence: null},
            {text: " وإذا", startMs: 31915, endMs: 32274, timestampMs: 32094, confidence: null},
            {text: " اختلفتِ", startMs: 32287, endMs: 32859, timestampMs: 32573, confidence: null},
            {text: " مع", startMs: 32872, endMs: 33085, timestampMs: 32978, confidence: null},
            {text: " صديقتِكِ", startMs: 33098, endMs: 34029, timestampMs: 33563, confidence: null},
            {text: " فلا", startMs: 34202, endMs: 34534, timestampMs: 34368, confidence: null},
            {text: " نتركُ", startMs: 34548, endMs: 35000, timestampMs: 34774, confidence: null},
            {text: " الغضبَ", startMs: 35013, endMs: 35518, timestampMs: 35265, confidence: null},
            {text: " يكبر", startMs: 35532, endMs: 36157, timestampMs: 35844, confidence: null},
            {text: " نتكلَّمُ", startMs: 37088, endMs: 37899, timestampMs: 37493, confidence: null},
            {text: " بهدوء", startMs: 37912, endMs: 38643, timestampMs: 38277, confidence: null},
            {text: " ونقول", startMs: 38817, endMs: 39681, timestampMs: 39249, confidence: null},
            {text: " أنا", startMs: 39880, endMs: 40226, timestampMs: 40053, confidence: null},
            {text: " حزنتُ", startMs: 40239, endMs: 40784, timestampMs: 40511, confidence: null},
            {text: " لأنَّ", startMs: 40798, endMs: 41423, timestampMs: 41110, confidence: null},
            {text: " ثمَّ", startMs: 42340, endMs: 42672, timestampMs: 42506, confidence: null},
            {text: " نستمعُ", startMs: 42686, endMs: 43271, timestampMs: 42978, confidence: null},
            {text: " إلى", startMs: 43285, endMs: 43604, timestampMs: 43444, confidence: null},
            {text: " رأيِها", startMs: 43617, endMs: 44309, timestampMs: 43963, confidence: null},
            {text: " وهكذا", startMs: 45239, endMs: 45931, timestampMs: 45585, confidence: null},
            {text: " يصبحُ", startMs: 45944, endMs: 46436, timestampMs: 46190, confidence: null},
            {text: " اللعبُ", startMs: 46449, endMs: 46901, timestampMs: 46675, confidence: null},
            {text: " أجملَ", startMs: 46915, endMs: 47394, timestampMs: 47154, confidence: null},
            {text: " للجميع", startMs: 47407, endMs: 48231, timestampMs: 47819, confidence: null},
            {text: " وهمسَتِ", startMs: 49501, endMs: 50166, timestampMs: 49833, confidence: null},
            {text: " الخريطة", startMs: 50179, endMs: 51017, timestampMs: 50598, confidence: null},
            {text: " اللعبُ", startMs: 51257, endMs: 51789, timestampMs: 51523, confidence: null},
            {text: " يساعدُكِ", startMs: 51802, endMs: 52507, timestampMs: 52154, confidence: null},
            {text: " أيضاً", startMs: 52520, endMs: 52985, timestampMs: 52752, confidence: null},
            {text: " على", startMs: 52999, endMs: 53238, timestampMs: 53118, confidence: null},
            {text: " أن", startMs: 53251, endMs: 53437, timestampMs: 53344, confidence: null},
            {text: " تتعلَّمي", startMs: 53451, endMs: 54063, timestampMs: 53757, confidence: null},
            {text: " التعاون", startMs: 54076, endMs: 54847, timestampMs: 54461, confidence: null},
            {text: " أي", startMs: 55073, endMs: 55339, timestampMs: 55206, confidence: null},
            {text: " أن", startMs: 55352, endMs: 55538, timestampMs: 55445, confidence: null},
            {text: " تلعبي", startMs: 55552, endMs: 56044, timestampMs: 55798, confidence: null},
            {text: " مع", startMs: 56057, endMs: 56230, timestampMs: 56143, confidence: null},
            {text: " الآخرين", startMs: 56243, endMs: 57107, timestampMs: 56675, confidence: null},
            {text: " لا", startMs: 57294, endMs: 57560, timestampMs: 57427, confidence: null},
            {text: " ضدَّهم", startMs: 57573, endMs: 58318, timestampMs: 57945, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 6" seed="wipe-6" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 4 — Health" durationInFrames={1506}>
        <WorldScene name="Health world" world="health" start={238.173} />
        <ArabicTitle
          name="Health title"
          from={54}
          durationInFrames={108}
          style={{color: '#ff4f8f', fontSize: 104}}
        >
          الجزيرةُ الرابعة: كنزُ الصحّةِ والعنايةِ بالنفس
        </ArabicTitle>
        <BasicCaptions
          name="Health captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " الجزيرةُ", startMs: 2000, endMs: 2718, timestampMs: 2359, confidence: null},
            {text: " الرابعة", startMs: 2731, endMs: 3449, timestampMs: 3090, confidence: null},
            {text: " كنزُ", startMs: 3635, endMs: 3967, timestampMs: 3801, confidence: null},
            {text: " الصحّةِ", startMs: 3981, endMs: 4539, timestampMs: 4260, confidence: null},
            {text: " والعنايةِ", startMs: 4552, endMs: 5337, timestampMs: 4945, confidence: null},
            {text: " بالنفس", startMs: 5350, endMs: 6015, timestampMs: 5683, confidence: null},
            {text: " هنا", startMs: 6949, endMs: 7361, timestampMs: 7155, confidence: null},
            {text: " ظهرَت", startMs: 7376, endMs: 7802, timestampMs: 7589, confidence: null},
            {text: " قبّةٌ", startMs: 7813, endMs: 8318, timestampMs: 8066, confidence: null},
            {text: " صغيرةٌ", startMs: 8332, endMs: 8997, timestampMs: 8665, confidence: null},
            {text: " على", startMs: 9010, endMs: 9289, timestampMs: 9150, confidence: null},
            {text: " شكلِ", startMs: 9304, endMs: 9650, timestampMs: 9477, confidence: null},
            {text: " قلب", startMs: 9663, endMs: 10221, timestampMs: 9942, confidence: null},
            {text: " وقالت", startMs: 10367, endMs: 11178, timestampMs: 10773, confidence: null},
            {text: " حقُّكِ", startMs: 11418, endMs: 11950, timestampMs: 11684, confidence: null},
            {text: " في", startMs: 11962, endMs: 12029, timestampMs: 11996, confidence: null},
            {text: " الصحّة", startMs: 12043, endMs: 12801, timestampMs: 12422, confidence: null},
            {text: " والصحّةُ", startMs: 13718, endMs: 14463, timestampMs: 14091, confidence: null},
            {text: " تعني", startMs: 14477, endMs: 14876, timestampMs: 14676, confidence: null},
            {text: " أن", startMs: 14889, endMs: 15049, timestampMs: 14969, confidence: null},
            {text: " نأكلَ", startMs: 15062, endMs: 15527, timestampMs: 15294, confidence: null},
            {text: " طعاماً", startMs: 15540, endMs: 16045, timestampMs: 15793, confidence: null},
            {text: " مفيداً", startMs: 16058, endMs: 16790, timestampMs: 16424, confidence: null},
            {text: " ونشربَ", startMs: 16949, endMs: 17601, timestampMs: 17275, confidence: null},
            {text: " الماء", startMs: 17615, endMs: 18054, timestampMs: 17834, confidence: null},
            {text: " ونغسلَ", startMs: 18226, endMs: 18851, timestampMs: 18539, confidence: null},
            {text: " أيدينا", startMs: 18865, endMs: 19583, timestampMs: 19224, confidence: null},
            {text: " ونرتاحَ", startMs: 19769, endMs: 20540, timestampMs: 20154, confidence: null},
            {text: " بالنوم", startMs: 20553, endMs: 21205, timestampMs: 20879, confidence: null},
            {text: " وإذا", startMs: 22493, endMs: 22985, timestampMs: 22739, confidence: null},
            {text: " شعرتِ", startMs: 22999, endMs: 23518, timestampMs: 23258, confidence: null},
            {text: " بتعبٍ", startMs: 23531, endMs: 24103, timestampMs: 23817, confidence: null},
            {text: " أو", startMs: 24115, endMs: 24328, timestampMs: 24222, confidence: null},
            {text: " بألم", startMs: 24341, endMs: 25019, timestampMs: 24680, confidence: null},
            {text: " فلا", startMs: 25180, endMs: 25539, timestampMs: 25359, confidence: null},
            {text: " تسكتي", startMs: 25552, endMs: 26084, timestampMs: 25818, confidence: null},
            {text: " وحدَكِ", startMs: 26098, endMs: 26750, timestampMs: 26424, confidence: null},
            {text: " فليسَ", startMs: 26961, endMs: 27480, timestampMs: 27221, confidence: null},
            {text: " عليكِ", startMs: 27493, endMs: 27892, timestampMs: 27693, confidence: null},
            {text: " أن", startMs: 27906, endMs: 28092, timestampMs: 27999, confidence: null},
            {text: " تتحمَّلي", startMs: 28105, endMs: 28797, timestampMs: 28451, confidence: null},
            {text: " ذلكَ", startMs: 28810, endMs: 29249, timestampMs: 29030, confidence: null},
            {text: " بصمت", startMs: 29262, endMs: 29927, timestampMs: 29595, confidence: null},
            {text: " أخبري", startMs: 30862, endMs: 31354, timestampMs: 31108, confidence: null},
            {text: " شخصاً", startMs: 31367, endMs: 31819, timestampMs: 31593, confidence: null},
            {text: " كبيراً", startMs: 31831, endMs: 32323, timestampMs: 32077, confidence: null},
            {text: " تثقينَ", startMs: 32338, endMs: 32910, timestampMs: 32624, confidence: null},
            {text: " به", startMs: 32923, endMs: 33242, timestampMs: 33082, confidence: null},
            {text: " وإذا", startMs: 33495, endMs: 33854, timestampMs: 33674, confidence: null},
            {text: " احتجنا", startMs: 33867, endMs: 34598, timestampMs: 34232, confidence: null},
            {text: " نطلبُ", startMs: 34851, endMs: 35409, timestampMs: 35130, confidence: null},
            {text: " مساعدةَ", startMs: 35423, endMs: 36101, timestampMs: 35762, confidence: null},
            {text: " الطبيب", startMs: 36113, endMs: 36818, timestampMs: 36466, confidence: null},
            {text: " ومشاعرُكِ", startMs: 38055, endMs: 38973, timestampMs: 38514, confidence: null},
            {text: " أيضاً", startMs: 38987, endMs: 39466, timestampMs: 39226, confidence: null},
            {text: " جزءٌ", startMs: 39478, endMs: 39877, timestampMs: 39678, confidence: null},
            {text: " من", startMs: 39891, endMs: 40051, timestampMs: 39971, confidence: null},
            {text: " صحّتِكِ", startMs: 40064, endMs: 40875, timestampMs: 40469, confidence: null},
            {text: " إذا", startMs: 41809, endMs: 42088, timestampMs: 41948, confidence: null},
            {text: " كنتِ", startMs: 42101, endMs: 42433, timestampMs: 42267, confidence: null},
            {text: " حزينةً", startMs: 42447, endMs: 43072, timestampMs: 42760, confidence: null},
            {text: " أو", startMs: 43259, endMs: 43485, timestampMs: 43372, confidence: null},
            {text: " متوتِّرةً", startMs: 43497, endMs: 44321, timestampMs: 43909, confidence: null},
            {text: " أو", startMs: 44495, endMs: 44708, timestampMs: 44601, confidence: null},
            {text: " خائفة", startMs: 44721, endMs: 45452, timestampMs: 45086, confidence: null},
            {text: " فمن", startMs: 45678, endMs: 46037, timestampMs: 45858, confidence: null},
            {text: " حقِّكِ", startMs: 46050, endMs: 46529, timestampMs: 46290, confidence: null},
            {text: " أن", startMs: 46543, endMs: 46742, timestampMs: 46642, confidence: null},
            {text: " تتحدَّثي", startMs: 46755, endMs: 47473, timestampMs: 47114, confidence: null},
            {text: " إلى", startMs: 47487, endMs: 47753, timestampMs: 47620, confidence: null},
            {text: " شخصٍ", startMs: 47766, endMs: 48178, timestampMs: 47972, confidence: null},
            {text: " يساعدُكِ", startMs: 48192, endMs: 49083, timestampMs: 48637, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 7" seed="wipe-7" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 5 — Respect" durationInFrames={1141}>
        <WorldScene name="Respect world" world="respect" start={288.358} />
        <ArabicTitle
          name="Respect title"
          from={66}
          durationInFrames={108}
          style={{color: '#7a4fd0', fontSize: 104}}
        >
          الجزيرةُ الخامسة: كنزُ الاحترامِ والكرامة
        </ArabicTitle>
        <BasicCaptions
          name="Respect captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " الجزيرةُ", startMs: 2399, endMs: 3091, timestampMs: 2745, confidence: null},
            {text: " الخامسة", startMs: 3105, endMs: 3876, timestampMs: 3490, confidence: null},
            {text: " كنزُ", startMs: 4048, endMs: 4367, timestampMs: 4208, confidence: null},
            {text: " الاحترامِ", startMs: 4380, endMs: 5032, timestampMs: 4706, confidence: null},
            {text: " والكرامة", startMs: 5045, endMs: 5949, timestampMs: 5497, confidence: null},
            {text: " في", startMs: 6884, endMs: 7110, timestampMs: 6997, confidence: null},
            {text: " آخرِ", startMs: 7124, endMs: 7603, timestampMs: 7363, confidence: null},
            {text: " جزيرةٍ", startMs: 7615, endMs: 8280, timestampMs: 7948, confidence: null},
            {text: " كانَ", startMs: 8293, endMs: 8599, timestampMs: 8446, confidence: null},
            {text: " هناكَ", startMs: 8613, endMs: 9078, timestampMs: 8845, confidence: null},
            {text: " علمٌ", startMs: 9091, endMs: 9570, timestampMs: 9331, confidence: null},
            {text: " مكتوبٌ", startMs: 9584, endMs: 10129, timestampMs: 9856, confidence: null},
            {text: " عليه", startMs: 10142, endMs: 10687, timestampMs: 10415, confidence: null},
            {text: " كنزُ", startMs: 10860, endMs: 11232, timestampMs: 11046, confidence: null},
            {text: " الاحترام", startMs: 11245, endMs: 12069, timestampMs: 11657, confidence: null},
            {text: " وقالَ", startMs: 12988, endMs: 13453, timestampMs: 13220, confidence: null},
            {text: " العلم", startMs: 13466, endMs: 14038, timestampMs: 13752, confidence: null},
            {text: " حقُّكِ", startMs: 14252, endMs: 14810, timestampMs: 14531, confidence: null},
            {text: " في", startMs: 14822, endMs: 14889, timestampMs: 14856, confidence: null},
            {text: " الاحترام", startMs: 14903, endMs: 15754, timestampMs: 15328, confidence: null},
            {text: " وهذا", startMs: 17021, endMs: 17566, timestampMs: 17293, confidence: null},
            {text: " يعني", startMs: 17579, endMs: 18018, timestampMs: 17799, confidence: null},
            {text: " أن", startMs: 18031, endMs: 18191, timestampMs: 18111, confidence: null},
            {text: " نتعاملَ", startMs: 18204, endMs: 18882, timestampMs: 18543, confidence: null},
            {text: " مع", startMs: 18896, endMs: 19056, timestampMs: 18976, confidence: null},
            {text: " الآخرينَ", startMs: 19069, endMs: 19761, timestampMs: 19415, confidence: null},
            {text: " بلُطف", startMs: 19774, endMs: 20332, timestampMs: 20053, confidence: null},
            {text: " فلا", startMs: 20531, endMs: 20890, timestampMs: 20711, confidence: null},
            {text: " نسخرُ", startMs: 20903, endMs: 21368, timestampMs: 21136, confidence: null},
            {text: " من", startMs: 21382, endMs: 21555, timestampMs: 21469, confidence: null},
            {text: " أحد", startMs: 21569, endMs: 22141, timestampMs: 21855, confidence: null},
            {text: " ولا", startMs: 22379, endMs: 22698, timestampMs: 22539, confidence: null},
            {text: " نجرحُ", startMs: 22713, endMs: 23232, timestampMs: 22972, confidence: null},
            {text: " أحداً", startMs: 23243, endMs: 23682, timestampMs: 23463, confidence: null},
            {text: " بالكلام", startMs: 23697, endMs: 24468, timestampMs: 24082, confidence: null},
            {text: " ولا", startMs: 24706, endMs: 25038, timestampMs: 24872, confidence: null},
            {text: " نرفعُ", startMs: 25052, endMs: 25504, timestampMs: 25278, confidence: null},
            {text: " أصواتَنا", startMs: 25517, endMs: 26248, timestampMs: 25883, confidence: null},
            {text: " دونَ", startMs: 26262, endMs: 26594, timestampMs: 26428, confidence: null},
            {text: " سبب", startMs: 26608, endMs: 27166, timestampMs: 26887, confidence: null},
            {text: " وحتّى", startMs: 28088, endMs: 28567, timestampMs: 28327, confidence: null},
            {text: " الاختلافاتُ", startMs: 28579, endMs: 29417, timestampMs: 28998, confidence: null},
            {text: " لها", startMs: 29430, endMs: 29736, timestampMs: 29583, confidence: null},
            {text: " مكانٌ", startMs: 29750, endMs: 30295, timestampMs: 30022, confidence: null},
            {text: " بيننا", startMs: 30308, endMs: 31026, timestampMs: 30667, confidence: null},
            {text: " فلكلِّ", startMs: 31957, endMs: 32555, timestampMs: 32256, confidence: null},
            {text: " شخصٍ", startMs: 32569, endMs: 33034, timestampMs: 32801, confidence: null},
            {text: " طريقةُ", startMs: 33048, endMs: 33673, timestampMs: 33360, confidence: null},
            {text: " تفكيرِه", startMs: 33685, endMs: 34403, timestampMs: 34044, confidence: null},
            {text: " وشكلُه", startMs: 34603, endMs: 35388, timestampMs: 34996, confidence: null},
            {text: " واهتماماتُه", startMs: 35560, endMs: 36677, timestampMs: 36119, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 8" seed="wipe-8" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Finale" durationInFrames={422}>
        <WorldScene name="Finale world" world="finale" start={326.407} />
        <BasicCaptions
          name="Finale captions"
          width={1500}
          combineTokensWithinMilliseconds={2600}
          style={{position: 'absolute', bottom: 70, translate: '210px 0px', direction: 'rtl'}}
          captions={[
            {text: " وهكذا", startMs: 1600, endMs: 2278, timestampMs: 1939, confidence: null},
            {text: " جمعتُ", startMs: 2292, endMs: 2824, timestampMs: 2558, confidence: null},
            {text: " كنوزَ", startMs: 2837, endMs: 3302, timestampMs: 3069, confidence: null},
            {text: " حقوقِ", startMs: 3316, endMs: 3728, timestampMs: 3522, confidence: null},
            {text: " الطفلِ", startMs: 3741, endMs: 4127, timestampMs: 3934, confidence: null},
            {text: " الخمسة", startMs: 4140, endMs: 4911, timestampMs: 4525, confidence: null},
            {text: " كلُّ", startMs: 5845, endMs: 6151, timestampMs: 5998, confidence: null},
            {text: " عامٍ", startMs: 6165, endMs: 6564, timestampMs: 6364, confidence: null},
            {text: " وأنتم", startMs: 6576, endMs: 7081, timestampMs: 6829, confidence: null},
            {text: " بخير", startMs: 7095, endMs: 7813, timestampMs: 7454, confidence: null},
            {text: " يا", startMs: 8026, endMs: 8186, timestampMs: 8106, confidence: null},
            {text: " أصدقائي", startMs: 8199, endMs: 9130, timestampMs: 8664, confidence: null},
          ]}
        />
      </TransitionSeries.Sequence>
      </TransitionSeries>
      <AbsoluteFill
        name="Fade in / out"
        style={{
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
          opacity: interpolate(frame, [0, 0.6 * fps, durationInFrames - 1.4 * fps, durationInFrames - 1], [1, 0, 0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
      <Track name="Narration">
        <Audio name="Fusha narration (child voice)" src={staticFile('voice-fusha.mp3')} />
      </Track>
      <Track name="Music and SFX">
        <Audio name="Calm music + sound effects" src={staticFile('music-and-sfx.mp3')} volume={0.9} />
      </Track>
    </AbsoluteFill>
  );
};
