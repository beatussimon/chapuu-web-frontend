const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/signup.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add missing imports
if (!content.includes('CustomAlert')) {
  content = content.replace(
    /import \{ router \} from 'expo-router';/,
    `import { CustomAlert } from '../components/CustomAlert';\nimport ScalePressable from '../components/ScalePressable';\nimport { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../hooks/useHaptics';\nimport { router } from 'expo-router';`
  );
}

// 2. Add Animated and useRef
content = content.replace(/import React, \{ useState \} from 'react';/, "import React, { useState, useRef } from 'react';");
content = content.replace(/ActivityIndicator\n\} from 'react-native';/, "ActivityIndicator,\n  Animated\n} from 'react-native';");

// 3. Remove Alert
content = content.replace(/\s*Alert,?/, '');
content = content.replace(/Alert\.alert/g, 'CustomAlert.alert');

// 4. Update state variables to include formShake
const shakeCode = `
  // Animation Refs
  const formShake = useRef(new Animated.Value(0)).current;

  const triggerErrorShake = () => {
    formShake.setValue(0);
    Animated.sequence([
      Animated.timing(formShake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };
`;
if (!content.includes('formShake')) {
  content = content.replace(
    /const \[acceptedPolicy, setAcceptedPolicy\] = useState\(false\);/,
    `const [acceptedPolicy, setAcceptedPolicy] = useState(false);\n${shakeCode}`
  );
}

// 5. Replace TouchableOpacity with ScalePressable
content = content.replace(/<TouchableOpacity style=\{styles\.backButton\}[^>]*>/g, '<ScalePressable style={styles.backButton} onPress={() => { triggerLightHaptic(); handleBack(); }}>');
content = content.replace(/<\/TouchableOpacity>/g, '</ScalePressable>');

content = content.replace(/<TouchableOpacity \n*\s*style=\{styles\.actionButton\}[^>]*>/g, '<ScalePressable style={styles.actionButton} onPress={() => { triggerLightHaptic(); handleNextStep(); }}>');
content = content.replace(/<TouchableOpacity \n*\s*style=\{\[styles\.actionButton, isLoading && styles\.disabledButton\]\}[^>]*>/g, '<ScalePressable style={[styles.actionButton, isLoading && styles.disabledButton]} onPress={handleSignup} disabled={isLoading}>');
content = content.replace(/<TouchableOpacity onPress=\{.*?router\.push\('\/login'\).*?\}>/g, `<ScalePressable onPress={() => { triggerLightHaptic(); router.push('/login'); }}>`);
content = content.replace(/<TouchableOpacity \n*\s*style=\{styles\.checkboxRow\}/g, '<ScalePressable style={styles.checkboxRow}');
content = content.replace(/<TouchableOpacity/g, '<ScalePressable');

// 6. Wrap ScrollView in Animated.View
if (!content.includes('Animated.View style={{ transform: [{ translateX: formShake }]')) {
  content = content.replace(
    /<View style=\{styles\.navHeader\}>/,
    '<Animated.View style={{ transform: [{ translateX: formShake }], flex: 1 }}>\n            <View style={styles.navHeader}>'
  );
  content = content.replace(
    /<\/View>\n\s*<\/ScrollView>/,
    '</View>\n          </Animated.View>\n        </ScrollView>'
  );
}

// 7. Add triggerErrorShake / haptics to errors
content = content.replace(/CustomAlert\.alert\('Error',/g, 'triggerErrorHaptic(); triggerErrorShake(); CustomAlert.alert(\'Error\',');
content = content.replace(/CustomAlert\.alert\('Agreement Required',/g, 'triggerErrorHaptic(); triggerErrorShake(); CustomAlert.alert(\'Agreement Required\',');
content = content.replace(/} catch \(e: any\) \{/, `} catch (e: unknown) {\n      triggerErrorHaptic();\n      triggerErrorShake();\n      const errorMessage = e instanceof Error ? e.message : 'Something went wrong.';\n      CustomAlert.alert('Signup Failed', errorMessage);\n      //`);
content = content.replace(/CustomAlert\.alert\('Signup Failed'.*\);/, ''); // remove old alert since replaced above
content = content.replace(/await updateUser\(role, access\);/, 'triggerSuccessHaptic();\n      await updateUser(role, access);');


fs.writeFileSync(file, content);
console.log('Fixed signup.tsx');
