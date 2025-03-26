// import "./posts.css";

// export default function Posts() {
//   const posts_array = [
//     ["author", "date", "content", [], 0, 0, "", "true_name", "../default.png"],
//     [
//       "mkazm",
//       "10/03/25",
//       "yo look at the sick ass pic of... uh... something, i found, and i definitely do not spam random words just to fill out space again",
//       ["#coding", "#seppukku"],
//       0,
//       0,
//       "../example.png",
//       "Maciej Kaźmierczak",
//       "../mkazm.png",
//     ],
//     [
//       "mkazm",
//       "03/04/24",
//       "ma daybirth",
//       [],
//       14,
//       3,
//       "",
//       "Maciej Kaźmierczak",
//       "../mkazm.png",
//     ],
//     [
//       "mkazm",
//       "10/03/25",
//       "I'm not the biggest fan of Next.js, but ig it only makes sense to rewrite technigram in it, plus from beggining I created technigram for just practicing SI, so why not use it to practice PAI, its not like anybody really cares. Btw dont mind it, im just tryna write something longer to see how will longer post look like ",
//       ["#GG", "#noFuture"],
//       0,
//       0,
//       "",
//       "Maciej Kaźmierczak",
//       "../mkazm.png",
//     ],
//   ];
//   return (
//     <div className="container posts">
//       {posts_array.map((post, index) => (
//         <div key={index} className="post">
//           <div>
//             <img src={post[8]} alt="pfp" className="post-pfp" />
//             <div className="post-author-container">
//               <div className="upper">
//                 <p className="post-author">@{post[0]}</p>
//                 <p className="date">{post[1]}</p>
//               </div>
//               <p className="post-author-name">{post[7]}</p>
//             </div>
//           </div>
//           <p>{post[2]}</p>
//           <div className="post-tags">
//             {post[3].map((tag, index) => (
//               <p key={index} className="post-tag">
//                 {tag}
//               </p>
//             ))}
//           </div>
//           <img src={post[6] === "" ? "null" : post[6]} className="post-image" />
//           <div className="post-stats-container">
//             <img
//               src="../icons/heart-icon.svg"
//               alt=""
//               className="heart-icon icon"
//             />
//             <p className="post-likes">{post[4]}</p>
//             <img
//               src="../icons/speech-bubble.png"
//               className="comment-icon icon"
//             />
//             <p className="post-likes">{post[5]}</p>
//           </div>
//           <div className="post-comment-container"></div>
//         </div>
//       ))}
//     </div>
//   );
// }
