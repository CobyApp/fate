exports.handler = async (event) => {
  console.log('Auto confirm user event:', JSON.stringify(event, null, 2));
  
  // Pre Sign-up Trigger: 회원가입 전에 계정을 자동으로 확인
  if (event.triggerSource === 'PreSignUp_SignUp' || event.triggerSource === 'PreSignUp_AdminCreateUser') {
    // 이메일 인증 없이 바로 사용 가능하도록 설정
    event.response = {
      ...event.response,
      autoConfirmUser: true,
      autoVerifyEmail: true,
      autoVerifyPhone: false
    };
    
    console.log('Auto confirming user:', event.userName);
    console.log('Event response:', JSON.stringify(event.response, null, 2));
    return event;
  }
  
  // Post Confirmation Trigger: 이미 확인된 상태이므로 그대로 반환
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    console.log('User already confirmed:', event.userName);
    return event;
  }
  
  console.log('Unhandled trigger source:', event.triggerSource);
  return event;
};
